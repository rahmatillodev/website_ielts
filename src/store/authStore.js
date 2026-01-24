

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
        if (get().isInitialized) return; 

        try {
          set({ loading: true, error: null })
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) throw sessionError

          if (session?.user) {
            set({ authUser: session.user })
            await get().fetchUserProfile(session.user.id)
          }

          // Auth holati o'zgarishini kuzatish (Login/Logout)
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              set({ authUser: session.user })
              await get().fetchUserProfile(session.user.id)
            } else if (event === 'SIGNED_OUT') {
              set({ authUser: null, userProfile: null, error: null })
              // Clear dashboard data on sign out
              const { useDashboardStore } = await import('@/store/dashboardStore')
              useDashboardStore.getState().clearDashboardData()
            }
          })

          set({ isInitialized: true })
        } catch (error) {
          set({ error: error.message })
        } finally {
          set({ loading: false })
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
          .select('*') // Use * to get all available columns (Supabase will only return what exists)
          .eq('id', userId)
          .single()

        if (!error) {
          set({ userProfile: data })
        } else {
          console.warn('[authStore] Error fetching user profile:', error)
        }
      },

      // Avatar yuklash
      uploadAvatar: async (file) => {
        const userId = get().authUser?.id;
        if (!userId) return { success: false, error: 'User not authenticated' };

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatar-image')
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          return { success: false, error: uploadError.message };
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatar-image')
          .getPublicUrl(fileName);

        return { success: true, url: publicUrl };
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
        const { error } = await supabase.auth.signOut()
        if (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
        set({ authUser: null, userProfile: null, loading: false })
        return { success: true }
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