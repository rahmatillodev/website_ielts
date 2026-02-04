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
        const { data: refreshData, error } = await supabase.auth.refreshSession();

        // Yangilangan sessiyani ishlatish, agar mavjud bo'lsa
        const activeSession = refreshData?.session || session;

        if (activeSession?.user) {
          set({ authUser: activeSession.user });
          await get().fetchUserProfile(activeSession.user.id, false);
        }

        if (!get()._authListener) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('event', event);
            console.log('session', session);
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

      signUp: async (email, password, username) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: username } } });
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
          if (data.subscription_status === 'vip') {
            data.subscription_status = 'premium';
          }
          /// 

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