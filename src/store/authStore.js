import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import supabase from '@/lib/supabase'
import { clearAllReadingData } from '@/store/LocalStorage/readingStorage'
import { clearAllListeningData } from '@/store/LocalStorage/listeningStorage'
import { compressAvatarImage } from '@/utils/mediaCompression'
import { getAuthErrorMessage, isNetworkError, toAuthErrorResult } from '@/lib/authErrors'
import { msUntilPremiumExpiry, normalizePremiumProfile } from '@/utils/premiumSubscription'

/**
 * Premium expiry, client side.
 *
 * The database is the authority — a trigger refuses to store an expired plan
 * and a scheduled sweep clears rows that lapse while nobody is looking (see
 * supabase/migrations/20260803090000_premium_subscription_expiry.sql). These
 * three hooks make a live session agree with it:
 *
 *  - every profile read is normalized before it reaches the UI, so a lapsed
 *    plan is never rendered as premium even for one frame;
 *  - the first read that notices the lapse calls the RPC to write it through,
 *    so the row stops carrying dates it should not have;
 *  - a timer armed at `premium_until` re-runs the check on a tab that was left
 *    open across the boundary, instead of waiting for the next reload.
 *
 * The timer lives at module scope: it is a side effect of the session, not
 * state anything renders, and it must never be persisted.
 */
let premiumExpiryTimer = null;
let premiumVisibilityHandler = null;

/** setTimeout silently fires immediately past this, and plans outlive it. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

const clearPremiumExpiryTimer = () => {
  if (premiumExpiryTimer) {
    clearTimeout(premiumExpiryTimer);
    premiumExpiryTimer = null;
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      authUser: null,
      userProfile: null,
      loading: false,
      error: null,
      isInitialized: false,
      _authListener: null, // Listenerni saqlash uchun

      initializeSession: async () => {
        if (get().isInitialized) return;

        set({ loading: true });

        // 1. Joriy sessiyani tekshirish
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          set({ authUser: session.user });
          await get().fetchUserProfile(session.user.id, false);
        } else {
          await supabase.auth.signOut();
          get().clearUserLocalData();
          set({ authUser: null, userProfile: null });
        }


        if (!get()._authListener) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
              set({ authUser: session.user });
              // Muhim: Profilni faqat authUser o'zgarganda va u null bo'lmasa yuklaymiz
              if (!get().userProfile) {
                await get().fetchUserProfile(session.user.id, false);
              }
            } else {
              set({ authUser: null, userProfile: null });
            }
            // Minimal holatni yangilash
            if ((event === 'SIGNED_IN' || event === "TOKEN_REFRESHED") && session?.user) {
              set({ authUser: session.user });
              // DB so‘rovini tashqaridan trigger qilamiz
            }

            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
              set({ authUser: null, userProfile: null });
              get().clearUserLocalData();
            }
          });

          set({ _authListener: subscription, isInitialized: true, loading: false });
        } else {
          set({ isInitialized: true, loading: false });
        }

        // Background tabs get their timers throttled and a sleeping machine
        // stops them altogether, so re-check whenever the tab comes back.
        if (typeof document !== 'undefined' && !premiumVisibilityHandler) {
          premiumVisibilityHandler = () => {
            if (document.visibilityState === 'visible') get().refreshPremiumStatus();
          };
          document.addEventListener('visibilitychange', premiumVisibilityHandler);
        }

        get().schedulePremiumExpiryCheck();
      },

      updateUserProfile: async (update) => {
        const userId = get().authUser?.id;
        if (!userId) {
          set({ error: 'User not authenticated', loading: false });
          return { success: false, error: 'User not authenticated' };
        }


        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('users')
            .update(update)
            .eq('id', userId)
            .select()
            .single();

          if (error) throw error;



          const profile = get().applyUserProfile(data);
          set({ loading: false });
          return { success: true, data: profile };
        } catch (error) {
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }
      },

      uploadAvatar: async (file) => {
        const userId = get().authUser?.id;
        if (!userId) {
          return { success: false, error: 'User not authenticated' };
        }
        try {
          const optimizedFile = await compressAvatarImage(file);
          const extensionFromType = optimizedFile?.type?.split('/')[1];
          const fileExt = (extensionFromType || optimizedFile.name.split('.').pop() || 'webp').toLowerCase();
          const filePath = `${userId}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('avatar-image')
            .upload(filePath, optimizedFile, {
              upsert: true,
              cacheControl: '31536000, immutable',
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('avatar-image').getPublicUrl(filePath);
          const url = urlData?.publicUrl;
          const currentVersion = Number(get().userProfile?.avatar_version) || 0;
          const nextVersion = currentVersion + 1;

          const { error: updateError } = await supabase
            .from('users')
            .update({
              avatar_image: url,
              avatar_version: nextVersion,
            })
            .eq('id', userId);

          if (updateError) throw updateError;

          await get().fetchUserProfile(userId);
          return { success: true, url };
        } catch (error) {
          return { success: false, error: error?.message || String(error) };
        }
      },

      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          // Normalize email to lowercase for consistent matching
          const normalizedEmail = email;

          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          });
          if (error) throw error;

          if (!data.user) {
            throw new Error('Sign in failed - no user returned');
          }

          set({ authUser: data.user });

          // Link any unlinked mock test bookings for this user
          console.log('[signIn] Starting booking linking process...');
          console.log('[signIn] Normalized email:', normalizedEmail);
          console.log('[signIn] User ID:', data.user.id);

          try {
            // First, check ALL bookings with this email (for debugging)
            console.log('[signIn] Checking ALL bookings with this email (for debugging)...');
            const { data: allBookings, error: allBookingsError } = await supabase
              .from('mock_test_clients')
              .select('id, email, user_id, full_name, created_at, phone_number')
              .ilike('email', normalizedEmail);

            console.log('[signIn] All bookings query error:', allBookingsError);
            console.log('[signIn] All bookings found:', allBookings);
            console.log('[signIn] Total bookings with this email:', allBookings?.length || 0);

            if (allBookings && allBookings.length > 0) {
              console.log('[signIn] Booking details:');
              allBookings.forEach((booking, index) => {
                console.log(`[signIn]   Booking ${index + 1}:`, {
                  id: booking.id,
                  email: booking.email,
                  user_id: booking.user_id,
                  full_name: booking.full_name,
                  created_at: booking.created_at
                });
              });
            }

            // Now check for unlinked bookings specifically
            console.log('[signIn] Checking for unlinked bookings (user_id is null)...');
            const { data: unlinkedBookings, error: checkError } = await supabase
              .from('mock_test_clients')
              .select('id, email, user_id, full_name')
              .ilike('email', normalizedEmail)
              .is('user_id', null);

            console.log('[signIn] Unlinked bookings query error:', checkError);
            console.log('[signIn] Unlinked bookings found:', unlinkedBookings);
            console.log('[signIn] Number of unlinked bookings:', unlinkedBookings?.length || 0);

            if (checkError) {
              console.error("[signIn] Error checking for unlinked bookings:", checkError);
              console.error("[signIn] Error details:", JSON.stringify(checkError, null, 2));
            } else if (unlinkedBookings && unlinkedBookings.length > 0) {
              console.log(`[signIn] Found ${unlinkedBookings.length} unlinked booking(s), attempting to link...`);

              const { data: updatedBookings, error: updateError } = await supabase
                .from('mock_test_clients')
                .update({
                  user_id: data.user.id,
                  updated_at: new Date().toISOString()
                })
                .ilike('email', normalizedEmail)
                .is('user_id', null)
                .select('id, email, user_id, phone_number');

              console.log('[signIn] Update query error:', updateError);
              console.log('[signIn] Updated bookings:', updatedBookings);
              console.log('[signIn] Number of bookings updated:', updatedBookings?.length || 0);

              if (updateError) {
                console.error("[signIn] Error linking mock test bookings:", updateError);
                console.error("[signIn] Update error details:", JSON.stringify(updateError, null, 2));
              } else if (updatedBookings && updatedBookings.length > 0) {
                console.log(`[signIn] ✅ Successfully linked ${updatedBookings.length} mock test booking(s) to user`);
                // Sync phone_number from mock_test_clients to users table
                const phoneFromBooking = updatedBookings.map((b) => b?.phone_number).find(Boolean);
                if (phoneFromBooking) {
                  const { error: phoneUpdateError } = await supabase
                    .from('users')
                    .update({ phone_number: phoneFromBooking })
                    .eq('id', data.user.id);
                  if (phoneUpdateError) {
                    console.error("[signIn] Error syncing phone_number to users:", phoneUpdateError);
                  } else {
                    console.log("[signIn] ✅ Synced phone_number from mock_test_clients to users");
                  }
                }
              } else {
                console.warn("[signIn] ⚠️ Update query returned empty array - no bookings were updated");
              }
            } else {
              console.log('[signIn] No unlinked bookings found for this email');
              if (allBookings && allBookings.length > 0) {
                console.log('[signIn] ⚠️ Found bookings with this email, but they all already have user_id assigned');
              } else {
                console.log('[signIn] ℹ️ No bookings found with this email at all');
              }
            }
          } catch (linkError) {
            console.error("[signIn] ❌ Error during booking linking process:", linkError);
            console.error("[signIn] Link error stack:", linkError.stack);
          }

          console.log('[signIn] Booking linking process completed');

          await get().fetchUserProfile(data.user.id, false);

          set({ loading: false });
          return { success: true };
        } catch (error) {
          const result = toAuthErrorResult(error, 'Sign in failed');
          set({ error: result.error, loading: false });
          return result;
        }
      },

      signUp: async (email, password, username) => {
        set({ loading: true, error: null });
        try {
          const normalizedEmail = email;
          
          // 1. Foydalanuvchini yaratish
          const { data, error } = await supabase.auth.signUp({ 
            email: normalizedEmail, 
            password, 
            options: { data: { full_name: username } } 
          });
      
          if (error) throw error;
          const newUser = data.user;
          if (!newUser) throw new Error('User creation failed');

          // Only treat the user as signed in when Supabase actually issued a
          // session. With email confirmation enabled, signUp returns a user but
          // NO session; setting authUser in that case flips App.jsx into its
          // authenticated routes, unmounts /signup mid-submit and drops the user
          // on a dashboard they cannot load - instead of the "check your inbox"
          // step. When confirmation is disabled this is unchanged: a session is
          // present, so authUser is set exactly as before.
          const hasSession = Boolean(data.session);
          if (hasSession) {
            set({ authUser: newUser });
          }

          // 2. Link mock_test_clients rows for this email (same as signIn: case-insensitive match)
          // RLS must allow UPDATE on rows where user_id is null and email matches auth user (see docs).
          const { data: updatedRecords, error: linkError } = await supabase
            .from('mock_test_clients')
            .update({
              user_id: newUser.id,
              updated_at: new Date().toISOString()
            })
            .ilike('email', normalizedEmail)  // Case-insensitive, same as signIn
            .is('user_id', null)
            .select();
      
          if (linkError) {
            console.error("Linking error:", linkError.message);
          } else if (updatedRecords?.length > 0) {
            console.log(`✅ ${updatedRecords.length} ta booking profilingizga biriktirildi.`);
            // Sync phone_number from mock_test_clients to users table
            const phoneFromBooking = updatedRecords.map((r) => r?.phone_number).find(Boolean) || null;
            const telegramChatId = updatedRecords.map((r) => r?.telegram_chat_id).find(Boolean) || null;
            const telegramUsername = updatedRecords.map((r) => r?.telegram_username).find(Boolean) || null;
              const { error: updateError } = await supabase
                .from('users')
                .update({ phone_number: phoneFromBooking , telegram_chat_id: telegramChatId , telegram_username: telegramUsername })
                .eq('id', newUser.id);
              if (updateError) {
                console.error("Error syncing data to users:", updateError.message);
              } else {
                console.log("✅ ma'lumotlar mock_test_clients dan users jadvaliga qo'shildi."); 
            }
          }
      
          // 3. Profil ma'lumotlarini yuklash
          await get().fetchUserProfile(newUser.id, false);

          set({ loading: false });
          // `needsEmailConfirmation` lets the page choose between navigating to
          // the dashboard and showing the confirm-your-email screen.
          return { success: true, needsEmailConfirmation: !hasSession };
        } catch (error) {
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }
      },

      resetPasswordForEmail: async (email) => {
        set({ loading: true, error: null });
        try {
          const normalizedEmail = email;
          const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`;
          const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo,
          });
          if (error) throw error;
          set({ loading: false });
          return { success: true };
        } catch (error) {
          const result = toAuthErrorResult(error, 'Failed to send reset link');
          set({ error: result.error, loading: false });
          return result;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        const email = get().authUser?.email;
        if (!email) {
          return { success: false, error: 'User not authenticated' };
        }
        set({ loading: true, error: null });
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: currentPassword,
          });
          if (signInError) {
            // Returned, not thrown, so this never reaches the catch below - a
            // dropped connection here would otherwise surface as "Failed to
            // fetch" while looking like a rejected password.
            //
            // The re-auth uses the signed-in user's own email, so a credentials
            // rejection can only mean the current password is wrong; the shared
            // "Invalid email or password" wording would send the user looking at
            // the wrong field.
            const result = isNetworkError(signInError)
              ? toAuthErrorResult(signInError)
              : {
                  success: false,
                  error: /invalid login credentials/i.test(signInError.message || '')
                    ? 'Current password is incorrect.'
                    : getAuthErrorMessage(signInError, 'Failed to update password'),
                  isNetworkError: false,
                };
            set({ loading: false });
            return result;
          }
          const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
          if (updateError) throw updateError;
          set({ loading: false });
          return { success: true };
        } catch (error) {
          const result = toAuthErrorResult(error, 'Failed to update password');
          set({ error: result.error, loading: false });
          return result;
        }
      },

      fetchUserProfile: async (userId, shouldLogoutOnMissing = true) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (error) throw error;

          if (!data && shouldLogoutOnMissing) {
            await get().forceSignOutToLogin('Profile not found.');
            return null;
          }

          if (!data) {
            set({ userProfile: null });
            return null;
          }

          // Normalizes vip → premium and winds back a lapsed plan, then writes
          // that expiry through to the row it came from.
          return get().applyUserProfile(data);
        } catch (error) {
          console.error("Profile fetch error:", error);
          return null;
        }
      },

      /**
       * The single door every profile takes into the store. Anything that has
       * just read or written the `users` row goes through here so the premium
       * rules are applied once, in one place.
       */
      applyUserProfile: (profile) => {
        const { profile: normalized, expired } = normalizePremiumProfile(profile);
        set({ userProfile: normalized });
        get().schedulePremiumExpiryCheck();
        if (expired) {
          // Fire and forget: the UI is already downgraded, and a failed write
          // is retried on the next read and swept server-side regardless.
          get().expirePremiumSubscription();
        }
        return normalized;
      },

      /**
       * Clears the lapsed plan in the database. Safe to call from the client:
       * the RPC only ever downgrades, only the caller's own row, and only when
       * `premium_until` really has passed.
       */
      expirePremiumSubscription: async () => {
        const userId = get().authUser?.id ?? get().userProfile?.id;
        if (!userId) return null;

        try {
          const { data, error } = await supabase.rpc('expire_own_premium_subscription');
          if (error) throw error;
          if (data) {
            const { profile } = normalizePremiumProfile(data);
            set({ userProfile: profile });
            return profile;
          }
        } catch (error) {
          // Not fatal: this session already treats the user as free, and the
          // scheduled sweep clears the row even if this client never succeeds.
          console.error('Premium expiry write failed:', error);
        }
        return get().userProfile;
      },

      /** Re-applies the premium rules to the profile already in memory. */
      refreshPremiumStatus: () => {
        const profile = get().userProfile;
        if (!profile) {
          clearPremiumExpiryTimer();
          return null;
        }
        return get().applyUserProfile(profile);
      },

      /**
       * Wakes up when the current plan lapses. Long plans exceed the setTimeout
       * ceiling, so the timer is re-armed in chunks until the real moment.
       */
      schedulePremiumExpiryCheck: () => {
        clearPremiumExpiryTimer();
        const remaining = msUntilPremiumExpiry(get().userProfile);
        if (remaining === null) return;

        // A second of slack keeps the timer from firing a hair early and
        // finding the plan still technically active.
        const delay = Math.min(remaining + 1000, MAX_TIMEOUT_MS);
        premiumExpiryTimer = setTimeout(() => {
          premiumExpiryTimer = null;
          get().refreshPremiumStatus();
        }, delay);
      },

      // LocalStorage tozalash mantiqi bitta joyda
      clearUserLocalData: () => {
        try {
          clearAllReadingData();
          clearAllListeningData();
          localStorage.removeItem('auth-storage'); // Zustand persist kaliti

          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('reading_') || key.startsWith('listening_') || key.includes('practice_') || key.includes('mock_test_'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          await supabase.auth.signOut();
          get().clearUserLocalData();
          clearPremiumExpiryTimer();
          set({ authUser: null, userProfile: null, loading: false });
          return { success: true };
        } catch (error) {
          set({ error: error.message, loading: false });
          return { success: false };
        }
      },

      forceSignOutToLogin: async (reason) => {
        await supabase.auth.signOut();
        get().clearUserLocalData();
        clearPremiumExpiryTimer();
        set({ authUser: null, userProfile: null, error: reason });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        authUser: state.authUser,
        userProfile: state.userProfile
      }),
      // The persisted copy can be days old, so a plan that lapsed since the tab
      // was last open would otherwise render as premium until the fetch lands.
      // Normalizing here means the first paint after a reload is already right;
      // fetchUserProfile then persists the expiry to the row.
      onRehydrateStorage: () => (state) => {
        if (!state?.userProfile) return;
        state.userProfile = normalizePremiumProfile(state.userProfile).profile;
      },
    }
  )
)