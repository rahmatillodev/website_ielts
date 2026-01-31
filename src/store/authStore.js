

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import supabase from '@/lib/supabase'
import { clearAllReadingData } from '@/store/LocalStorage/readingStorage'
import { clearAllListeningData } from '@/store/LocalStorage/listeningStorage'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // --- State ---
      authUser: null,
      userProfile: null,
      loading: false,
      error: null,
      isInitialized: false,


      initializeSession: async () => {
        if (get().isInitialized && get().authUser) return;
      
        try {
          set({ loading: true });
      
          const { data: { session } } = await supabase.auth.getSession();
      
          if (session?.user) {
            set({ authUser: session.user });
            await get().fetchUserProfile(session.user.id);
          } else {
            set({ authUser: null, userProfile: null });
          }
      
          if (!get().isInitialized) {
            const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
              if (event === 'SIGNED_IN' && session?.user) {
                set({ authUser: session.user });
                await get().fetchUserProfile(session.user.id);
              } else if (event === 'SIGNED_OUT') {
                set({ authUser: null, userProfile: null });
                set({ isInitialized: false }); // 🔥 important
              }
            });
      
            // store unsubscribe if needed later
            set({ _authListener: listener?.subscription });
          }
      
          set({ isInitialized: true });
        } catch (error) {
          set({ error: error.message });
        } finally {
          set({ loading: false });
        }
      },
      

      // Kirish (Sign In)
      signIn: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })

          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          set({ authUser: data.user })
          // Fetch profile - if it fails, don't block the login
          try {
            await get().fetchUserProfile(data.user.id)
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError)
            // Continue with login even if profile fetch fails
          }
          set({ loading: false })
          return { success: true }
        } catch (error) {
          const message = error?.message || 'Failed to sign in. Please try again.'
          set({ error: message, loading: false })
          return { success: false, error: message }
        }
      },

      // Ro'yxatdan o'tish (Sign Up)
      signUp: async (email, password, fullName) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName || "User" } }
          })

          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          set({ authUser: data.user })

          // Try to fetch profile - if it doesn't exist yet (e.g., waiting for DB trigger), 
          // that's okay, the onAuthStateChange listener will handle it later
          if (data.user) {
            try {
              // Don't force logout if profile is missing (common for new signups)
              await get().fetchUserProfile(data.user.id, false)
            } catch (profileError) {
              console.log('Profile not available yet, will be fetched by auth state listener')
              // Continue - profile will be fetched by onAuthStateChange or created by trigger
            }
          }

          set({ loading: false })
          return { success: true }
        } catch (error) {
          const message = error?.message || 'Failed to sign up. Please try again.'
          set({ error: message, loading: false })
          return { success: false, error: message }
        }
      },

      // Profilni olish
      fetchUserProfile: async (userId, shouldLogoutOnMissing = true) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle(); // Xato bermay null qaytaradi

          if (error) {
            console.error("Error fetching user profile:", error);
            if (shouldLogoutOnMissing) {
              await get().forceSignOutToLogin('Error fetching profile.');
            }
            return null;
          }

          if (!data) {
            console.warn("User profile missing in Database.");
            if (shouldLogoutOnMissing) {
              await get().forceSignOutToLogin('Unauthorized: Profile not found.');
            }
            return null;
          }

          set({ userProfile: data });
          return data;
        } catch (error) {
          console.error("Exception in fetchUserProfile:", error);
          if (shouldLogoutOnMissing) {
            await get().forceSignOutToLogin('Error fetching profile.');
          }
          return null;
        }
      },

      // Sessiya bor bo'lsa ham DB'da user borligini tekshirish
      validateSessionAgainstDatabase: async () => {
        const authUser = get().authUser;
        if (!authUser?.id) return false;
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();

          if (error || !data) {
            await get().forceSignOutToLogin('Unauthorized: Profile not found.');
            return false;
          }
          return true;
        } catch (error) {
          set({ error: error.message });
          return false;
        }
      },

      // Avatar yuklash
      uploadAvatar: async (file) => {
        try {
          const userId = get().authUser?.id;
          if (!userId) {
            return { success: false, error: 'User not authenticated. Please log in again.' };
          }

          // Validate file exists
          if (!file) {
            return { success: false, error: 'No file selected. Please choose an image.' };
          }

          // Validate file type
          const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
          if (!validImageTypes.includes(file.type)) {
            return { success: false, error: 'Invalid file format. Please select a JPEG, PNG, GIF, or WebP image.' };
          }

          // Validate file size (5MB limit)
          const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
          if (file.size > maxSizeInBytes) {
            return { success: false, error: 'File size too large. Please select an image smaller than 5MB.' };
          }

          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}-${Date.now()}.${fileExt}`;

          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from('avatar-image')
            .upload(fileName, file, { upsert: true });

          if (uploadError) {
            // Provide user-friendly error messages
            let errorMessage = 'Failed to upload image. ';
            if (uploadError.message.includes('size')) {
              errorMessage += 'File size is too large.';
            } else if (uploadError.message.includes('format') || uploadError.message.includes('type')) {
              errorMessage += 'Invalid file format.';
            } else if (uploadError.message.includes('network') || uploadError.message.includes('timeout')) {
              errorMessage += 'Network error. Please check your connection and try again.';
            } else {
              errorMessage += uploadError.message || 'Please try again later.';
            }
            return { success: false, error: errorMessage };
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('avatar-image')
            .getPublicUrl(fileName);

          if (!publicUrl) {
            return { success: false, error: 'Failed to generate image URL. Please try again.' };
          }

          return { success: true, url: publicUrl };
        } catch (error) {
          // Catch any unexpected errors
          const errorMessage = error?.message || 'An unexpected error occurred during upload. Please try again.';
          return { success: false, error: errorMessage };
        }
      },

      // Profilni yangilash
      updateUserProfile: async (profileData) => {
        const userId = get().authUser?.id;
        if (!userId) return { success: false, error: 'User not authenticated' };

        set({ loading: true, error: null });

        const { data, error } = await supabase
          .from('users')
          .update(profileData)
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }

        set({ userProfile: data, loading: false });
        return { success: true };
      },

      // Chiqish (Sign Out)
      signOut: async () => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase.auth.signOut()
          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }
      
          // Clear Zustand state
          set({
            authUser: null,
            userProfile: null,
            loading: false,
            isInitialized: false
                    })
      
          // Clear only user-related storage
          try {
            clearAllReadingData()
            clearAllListeningData()
            localStorage.removeItem('auth-storage')
      
            const keysToRemove = []
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (!key) continue
      
              const isUserData =
                key.startsWith('reading_') ||
                key.startsWith('listening_') ||
                key.includes('practice_') ||
                key.includes('result_') ||
                key.includes('audio_position_')
      
              if (isUserData) keysToRemove.push(key)
            }
      
            keysToRemove.forEach(k => localStorage.removeItem(k))
          } catch (e) {
            console.warn('Storage cleanup error:', e)
          }
      
          return { success: true, redirectTo: '/' }
        } catch (error) {
          const message = error?.message || 'Failed to log out. Please try again.'
          set({ error: message, loading: false })
          return { success: false, error: message }
        }
      },
      

      // Xavfsizlik uchun logout va login sahifasiga yo'naltirish
      forceSignOutToLogin: async (reason) => {
        set({ loading: true, error: reason || null })
        try {
          await supabase.auth.signOut()
        } catch (error) {
          const message = error?.message || reason || 'Failed to log out.'
          set({ error: message })
        } finally {
          // Clear Zustand state
          set({ authUser: null, userProfile: null, isInitialized: false, loading: false })

          // Clear all user-specific localStorage data
          try {
            // Clear reading and listening practice/result data
            clearAllReadingData()
            clearAllListeningData()

            // Clear Zustand persist storage
            localStorage.removeItem('auth-storage')

            // Clear any other user-specific keys (comprehensive cleanup)
            const keysToRemove = []
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key) {
                // Keep UI preferences (theme, sidebar, etc.) but clear user data
                const isUserData =
                  key.startsWith('reading_') ||
                  key.startsWith('listening_') ||
                  key === 'auth-storage' ||
                  key.includes('practice_') ||
                  key.includes('result_') ||
                  key.includes('audio_position_')

                if (isUserData) {
                  keysToRemove.push(key)
                }
              }
            }

            // Remove all identified user-specific keys
            keysToRemove.forEach(key => {
              try {
                localStorage.removeItem(key)
              } catch (err) {
                console.warn(`Failed to remove key ${key}:`, err)
              }
            })
          } catch (storageError) {
            console.error('Error clearing localStorage:', storageError)
          }

          // Navigate to landing page - use setTimeout to avoid blocking
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              if (window.location.pathname !== '/') {
                window.location.href = '/'
              }
            }, 100)
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage', // localStorage dagi kalit nomi
      storage: createJSONStorage(() => localStorage), // Ma'lumotni qayerga saqlash
      partialize: (state) => ({
        authUser: state.authUser,
        userProfile: state.userProfile,
      }), // Faqat kerakli qismlarni localStoragega saqlaymiz (loading saqlanmaydi)
    }
  )
)