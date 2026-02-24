import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import supabase from '@/lib/supabase'
import { clearAllReadingData } from '@/store/LocalStorage/readingStorage'
import { clearAllListeningData } from '@/store/LocalStorage/listeningStorage'

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


        // 2. Sessiyani yangilash (kickstart)
        const { data: refreshData } = await supabase.auth.refreshSession();

        const activeSession = refreshData?.session || session;

        if (activeSession?.user) {
          set({ authUser: activeSession.user });
          await get().fetchUserProfile(activeSession.user.id, false);
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



          set({ userProfile: data, loading: false });
          return { success: true, data };
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
          const fileExt = file.name.split('.').pop();
          const filePath = `${userId}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('avatar-image')
            .upload(filePath, file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('avatar-image').getPublicUrl(filePath);
          const url = urlData?.publicUrl;

          const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_image: url })
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
          const normalizedEmail = email.trim().toLowerCase();

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
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }
      },

      signUp: async (email, password, username) => {
        set({ loading: true, error: null });
        try {
          const normalizedEmail = email.trim().toLowerCase();
          
          // 1. Foydalanuvchini yaratish
          const { data, error } = await supabase.auth.signUp({ 
            email: normalizedEmail, 
            password, 
            options: { data: { full_name: username } } 
          });
      
          if (error) throw error;
          const newUser = data.user;
          if (!newUser) throw new Error('User creation failed');
      
          set({ authUser: newUser });
      
          // 2. FAQAT ushbu foydalanuvchiga tegishli bookinglarni bog'lash
          // RLS yuqoridagi qoidaga ko'ra begonalar emailini yangilashga yo'l qo'ymaydi
          const { data: updatedRecords, error: linkError } = await supabase
            .from('mock_test_clients')
            .update({ 
              user_id: newUser.id,
              updated_at: new Date().toISOString()
            })
            .eq('email', normalizedEmail) // Faqat shu emailga tegishli qatorlar
            .is('user_id', null)          // Faqat hali bog'lanmaganlar
            .select();                    // Natijani qaytarish (phone_number bilan users jadvaliga yozish uchun)
      
          if (linkError) {
            console.error("Linking error:", linkError.message);
          } else if (updatedRecords?.length > 0) {
            console.log(`✅ ${updatedRecords.length} ta booking profilingizga biriktirildi.`);
            // Sync phone_number from mock_test_clients to users table
            const phoneFromBooking = updatedRecords.map((r) => r?.phone_number).find(Boolean);
            if (phoneFromBooking) {
              const { error: phoneUpdateError } = await supabase
                .from('users')
                .update({ phone_number: phoneFromBooking })
                .eq('id', newUser.id);
              if (phoneUpdateError) {
                console.error("Error syncing phone_number to users:", phoneUpdateError.message);
              } else {
                console.log("✅ phone_number mock_test_clients dan users jadvaliga qo'shildi.");
              }
            }
          }
      
          // 3. Profil ma'lumotlarini yuklash
          await get().fetchUserProfile(newUser.id, false);
          
          set({ loading: false });
          return { success: true };
        } catch (error) {
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
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

          // Subscription status to premium
          if (data.subscription_status === 'vip') {
            data.subscription_status = 'premium';
          }
          // End of subscription status to premium

          // Check if premium_until is past the current date
          if (data.premium_until && new Date(data.premium_until) < new Date()) {
            data.subscription_status = 'free';
          }

          set({ userProfile: data });
          return data;
        } catch (error) {
          console.error("Profile fetch error:", error);
          return null;
        }
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
            if (key && (key.startsWith('reading_') || key.startsWith('listening_') || key.includes('practice_'))) {
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
    }
  )
)