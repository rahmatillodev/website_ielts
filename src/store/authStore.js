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
        
        if (session?.user) {
          set({ authUser: session.user });
          await get().fetchUserProfile(session.user.id, false);
        }

        // 2. Auth listenerni o'rnatish (faqat bir marta)
        if (!get()._authListener) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user || event === "TOKEN_REFRESHED" && session?.user) {
              set({ authUser: session.user });
              await get().fetchUserProfile(session.user.id, false);
            }

            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
              // Store-ni tozalash, lekin isInitialized true qoladi
              set({ authUser: null, userProfile: null });
              get().clearUserLocalData();
            }
          });

          set({ _authListener: subscription, isInitialized: true, loading: false });
        } else {
          set({ isInitialized: true, loading: false });
        }
      },

      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          set({ authUser: data.user });
          await get().fetchUserProfile(data.user.id, false);
          
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
            await get().forceSignOutToLogin('Profil topilmadi.');
            return null;
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