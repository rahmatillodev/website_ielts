

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
      // User attempts data
      attempts: [],
      scores: { listening: null, reading: null, average: null },
      attemptsLoading: false,
      lastFetched: null, 


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
              get().clearAttempts()
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
          .select('*')
          .eq('id', userId)
          .single()

        if (!error) {
          set({ userProfile: data })
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
        set({ loading: true })
        await supabase.auth.signOut()
        get().clearAttempts()
        set({ authUser: null, userProfile: null, loading: false })
      },

      clearError: () => set({ error: null }),

      // Fetch user attempts with smart caching
      fetchUserAttempts: async (forceRefresh = false) => {
        const state = get();
        const userId = state.authUser?.id;
        
        if (!userId) {
          set({ attempts: [], scores: { listening: null, reading: null, average: null }, attemptsLoading: false });
          return;
        }

        // Check if we should fetch based on caching rules
        const now = Date.now();
        const lastFetched = state.lastFetched;
        const cacheTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        const shouldFetch = 
          forceRefresh || 
          state.attempts.length === 0 || 
          !lastFetched || 
          (now - lastFetched) > cacheTimeout;

        if (!shouldFetch && !state.attemptsLoading) {
          // Return cached data
          return {
            attempts: state.attempts,
            scores: state.scores,
          };
        }

        // Prevent concurrent fetches
        if (state.attemptsLoading) {
          return {
            attempts: state.attempts,
            scores: state.scores,
          };
        }

        try {
          set({ attemptsLoading: true });

          // Fetch attempts
          const { data: attemptsData, error: attemptsError } = await supabase
            .from('user_attempts')
            .select('id, test_id, score, time_taken, total_questions, created_at, completed_at')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false });

          if (attemptsError) {
            console.error('Error fetching attempts:', attemptsError);
            set({ 
              attempts: [], 
              attemptsLoading: false,
              scores: { listening: null, reading: null, average: null }
            });
            return { attempts: [], scores: { listening: null, reading: null, average: null } };
          }

          const attempts = Array.isArray(attemptsData) ? attemptsData : [];

          // Fetch test types for all unique test_ids
          const testIds = [...new Set(attempts.map(a => a.test_id).filter(Boolean))];
          const testTypesMap = {};

          if (testIds.length > 0) {
            const { data: testsData, error: testsError } = await supabase
              .from('test')
              .select('id, type')
              .in('id', testIds);

            if (!testsError && testsData) {
              testsData.forEach(test => {
                testTypesMap[test.id] = test.type;
              });
            }
          }

          // Add test type to each attempt
          const attemptsWithType = attempts.map(attempt => ({
            ...attempt,
            testType: testTypesMap[attempt.test_id] || null,
          }));

          // Calculate latest scores for listening and reading
          const listeningAttempts = attemptsWithType.filter(
            (a) => a.testType === 'listening'
          );
          const readingAttempts = attemptsWithType.filter(
            (a) => a.testType === 'reading'
          );

          // Get latest scores
          const lastListening = listeningAttempts[0]?.score;
          const lastReading = readingAttempts[0]?.score;

          // Calculate average from available scores
          const latestScores = [lastListening, lastReading].filter(s => s !== null && s !== undefined);
          const averageScore = latestScores.length > 0
            ? latestScores.reduce((a, b) => a + b, 0) / latestScores.length
            : null;

          const scores = {
            listening: lastListening ?? null,
            reading: lastReading ?? null,
            average: averageScore ? Number(averageScore.toFixed(1)) : null,
          };

          set({
            attempts: attemptsWithType,
            scores,
            attemptsLoading: false,
            lastFetched: now,
          });

          return { attempts: attemptsWithType, scores };
        } catch (error) {
          console.error('Error in fetchUserAttempts:', error);
          set({ 
            attempts: [], 
            attemptsLoading: false,
            scores: { listening: null, reading: null, average: null }
          });
          return { attempts: [], scores: { listening: null, reading: null, average: null } };
        }
      },

      // Clear attempts data (useful on logout)
      clearAttempts: () => {
        set({ 
          attempts: [], 
          scores: { listening: null, reading: null, average: null },
          lastFetched: null 
        });
      },
    }),
    {
      name: 'auth-storage', // localStorage dagi kalit nomi
      storage: createJSONStorage(() => localStorage), // Ma'lumotni qayerga saqlash
      partialize: (state) => ({ 
        authUser: state.authUser, 
        userProfile: state.userProfile,
        attempts: state.attempts,
        scores: state.scores,
        lastFetched: state.lastFetched,
      }), // Faqat kerakli qismlarni localStoragega saqlaymiz (loading saqlanmaydi)
    }
  )
)