

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import supabase from '@/lib/supabase'

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
        // initialized bo'lsa ham sessiyani tekshirish kerak bo'lishi mumkin
        try {
          set({ loading: true });
          const { data: { session } } = await supabase.auth.getSession();
      
          if (session?.user) {
            set({ authUser: session.user });
            // Diqqat: Har doim bazadan tekshiramiz
            await get().fetchUserProfile(session.user.id);
          } else {
            set({ authUser: null, userProfile: null });
          }
      
          // Auth o'zgarishini kuzatish
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              set({ authUser: session.user });
              await get().fetchUserProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
              set({ authUser: null, userProfile: null });
            }
          });
      
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }

        set({ authUser: data.user })
        await get().fetchUserProfile(data.user.id)
        set({ loading: false })
        return { success: true }
      },

      // Ro'yxatdan o'tish (Sign Up)
      signUp: async (email, password, fullName) => {
        set({ loading: true, error: null })
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || "User" } }
        })

        if (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }

        set({ authUser: data.user, loading: false })
        // Trigger ishga tushishi uchun biroz kutish yoki profilni keyinroq olish mumkin
        return { success: true }
      },

      // Profilni olish
      fetchUserProfile: async (userId) => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle(); // Xato bermay null qaytaradi
      
        if (error || !data) {
          console.error("User profile missing in Database. Logging out...");
          await get().forceSignOutToLogin('Unauthorized: Profile not found.');
          return;
        }
      
        set({ userProfile: data });
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
            set({ error: error.message })
            return { success: false, error: error.message }
          }
          set({ authUser: null, userProfile: null })
          return { success: true }
        } catch (error) {
          const message = error?.message || 'Failed to log out. Please try again.'
          set({ error: message })
          return { success: false, error: message }
        } finally {
          set({ loading: false })
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
          set({ authUser: null, userProfile: null, loading: false })
          if (typeof window !== 'undefined') {
            if (window.location.pathname !== '/') {
              window.location.assign('/')
            }
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