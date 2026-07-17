import { create } from "zustand";
import supabase from "@/lib/supabase";

/**
 * Mock test paroli: foydalanuvchi modalda kiritgandan keyin shu sessiyada saqlanadi, chunki
 * /mock-test/flow/:id sahifasi reload'dan keyin ham parolni RPC'ga uzatishi kerak.
 * Bu sir emas - foydalanuvchining o'zi kiritgan qiymati. Soxta qiymat foyda bermaydi:
 * RPC uni har safar DB bilan solishtiradi.
 */
const mockPasswordKey = (mockTestId) => `mock_test_pw_${mockTestId}`;

export const setVerifiedMockPassword = (mockTestId, password) => {
    try {
        if (!mockTestId || !password) return;
        sessionStorage.setItem(mockPasswordKey(mockTestId), password);
    } catch {
        // sessionStorage yo'q bo'lsa (private mode) - jim o'tamiz
    }
};

export const getVerifiedMockPassword = (mockTestId) => {
    try {
        return mockTestId ? sessionStorage.getItem(mockPasswordKey(mockTestId)) : null;
    } catch {
        return null;
    }
};

export const clearVerifiedMockPassword = (mockTestId) => {
    try {
        if (mockTestId) sessionStorage.removeItem(mockPasswordKey(mockTestId));
    } catch {
        // ignore
    }
};

export const useMockTestClientStore = create((set) => ({
    client: null,
    mockTest: null,
    loading: false,
    error: null,
    /** True if current user has at least one row in mock_test_clients; false if not; null before checked */
    isMockTestClient: null,

    /**
     * Check if the given user ID exists in mock_test_clients table.
     * Sets isMockTestClient and returns the result.
     * @param {string} userId - The user ID to check
     * @returns {Promise<boolean>}
     */
    checkUserIsMockTestClient: async (userId) => {
        if (!userId) {
            set({ isMockTestClient: false });
            return false;
        }
        try {
            const { data, error } = await supabase
                .from("mock_test_clients")
                .select("id")
                .eq("user_id", userId)
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            const isClient = !!data;
            set({ isMockTestClient: isClient });
            return isClient;
        } catch (err) {
            console.error("Error checking mock test client:", err);
            set({ isMockTestClient: false });
            return false;
        }
    },

    fetchClientById: async (clientId) => {
        set({ loading: true, error: null });

        try {
            const { data, error } = await supabase
                .from("mock_test_clients")
                .select('*')
                .eq("user_id", clientId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;


            set({ client: data, loading: false });
            return data;
        } catch (err) {
            set({ error: err.message || "Failed to fetch client", loading: false });
            return null;
        }
    },

    // Parolni RPC orqali tekshiramiz. `mock_test` jadvalini to'g'ridan-to'g'ri o'qish
    // oddiy foydalanuvchilar uchun yopilgan - aks holda password_code brauzerga tushardi.
    fetchMockTestByPassword: async (passwordCode) => {
        set({ loading: true, error: null });

        try {
            const { data, error } = await supabase
                .rpc("get_mock_test_by_password", { p_password: passwordCode });

            if (error) throw error;

            const mockTest = Array.isArray(data) ? data[0] : data;
            if (!mockTest) {
                throw new Error("Mock test not found with the provided password code");
            }

            set({ mockTest, loading: false });
            return mockTest;
        } catch (err) {
            set({ error: err.message || "Failed to fetch mock test", loading: false });
            return null;
        }
    },

    fetchMockTestById: async (mockTestId) => {
        set({ loading: true, error: null });

        try {
            // Parolsiz test kontentini olib bo'lmaydi. Parol foydalanuvchi modalda kiritgan
            // qiymat bo'lib, sessionStorage'da saqlanadi - RPC uni DB bilan solishtiradi,
            // ya'ni soxta qiymat ishlamaydi.
            const password = getVerifiedMockPassword(mockTestId);
            if (!password) {
                set({
                    mockTest: null,
                    error: "Mock test password required",
                    loading: false,
                });
                return null;
            }

            const { data, error } = await supabase.rpc("get_mock_test_for_attempt", {
                p_mock_test_id: mockTestId,
                p_password: password,
            });

            if (error) throw error;

            const mockTest = Array.isArray(data) ? data[0] : data;
            if (!mockTest) {
                clearVerifiedMockPassword(mockTestId);
                throw new Error("Mock test not found");
            }

            set({ mockTest, loading: false });
            return mockTest;
        } catch (err) {
            set({ error: err.message || "Failed to fetch mock test", loading: false });
            return null;
        }
    },

    // fetchMockTestByUserId olib tashlandi: u parolsiz mock kontentini qaytarardi va
    // mock_test_id yo'q bo'lsa ixtiyoriy aktiv mockni fallback qilib berardi - ya'ni parol
    // darvozasini aylanib o'tish yo'li edi. Bundan tashqari o'lik kod edi: /mock-test/flow/:id
    // marshrutida param doim mavjud, shuning uchun chaqirilmasdi.

    /** Valid status values for mock_test_clients */
    VALID_CLIENT_STATUSES: ['booked', 'started', 'completed', 'checked', 'notified'],

    /**
     * Update mock_test_clients status. Never persists invalid state.
     * @param {string} clientId - The mock test client ID
     * @param {string} status - New status: 'booked' | 'started' | 'completed' | 'checked' | 'notified'
     * @param {string} mockTestId - Optional mock test ID to set when status is 'started'
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    updateClientStatus: async (clientId, status, mockTestId = null) => {
        try {
            // Validation: never update with invalid data
            const validStatuses = useMockTestClientStore.getState().VALID_CLIENT_STATUSES;
            if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
                return { success: false, error: 'Client ID is required' };
            }
            if (!status || !validStatuses.includes(status)) {
                return { success: false, error: `Invalid status: ${status}` };
            }
            if (status === 'started' && mockTestId != null && (typeof mockTestId !== 'string' || !mockTestId.trim())) {
                return { success: false, error: 'Mock test ID must be non-empty when status is started' };
            }

            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            // Set mock_test_id when status is 'started' if provided
            if (status === 'started' && mockTestId) {
                updateData.mock_test_id = mockTestId;
            }

            const { data: updatedRows, error } = await supabase
                .from("mock_test_clients")
                .update(updateData)
                .eq("id", clientId)
                .select("id, status, mock_test_id, updated_at");

            if (error) throw error;

            // If 0 rows updated, verify whether row exists (RLS may block update but allow select, or id may be wrong)
            if (!updatedRows || updatedRows.length === 0) {
                const { data: rowAfter } = await supabase.from("mock_test_clients").select("id, status, mock_test_id, user_id").eq("id", clientId).maybeSingle();
                return {
                    success: false,
                    error: rowAfter
                        ? "Update was not applied (likely Row Level Security). Ensure mock_test_clients has an UPDATE policy allowing user_id = auth.uid()."
                        : "No mock test client row found for this id.",
                };
            }

            // Update local client state if it matches
            const currentState = useMockTestClientStore.getState();
            if (currentState.client && currentState.client.id === clientId) {
                set({ client: { ...currentState.client, status, ...(status === 'started' && mockTestId ? { mock_test_id: mockTestId } : {}) } });
            }

            return { success: true };
        } catch (err) {
            console.error('Error updating mock test client status:', err);
            return {
                success: false,
                error: err.message || "Failed to update client status",
            };
        }
    },

    /**
     * Fetch client attempts for a mock test
     * @param {string} userId - The user ID to fetch mock_test and attempts
     * @param {string} mockTestId - Optional mock test ID to filter by
     * @returns {Promise<{client: object, mockTest: object, results: {listening: object|null, reading: object|null, writing: object|null, speaking: object|null}}>}
     */
    fetchClientAttempts: async (userId, mockTestId = null) => {
        set({ loading: true, error: null });

        try {
            // 1. Get the client using user_id and optionally mock_test_id
            let clientQuery = supabase
                .from('mock_test_clients')
                .select('id, user_id, total_score, status, full_name, email, mock_test_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (mockTestId) {
                clientQuery = clientQuery.eq('mock_test_id', mockTestId);
            }

            const { data: client, error: clientError } = await clientQuery.limit(1).maybeSingle();

            if (clientError) throw clientError;
            if (!client) {
                throw new Error('Client not found');
            }

            // 2. Get the mock_test sections for this client's own mock test.
            // RPC faqat chaqiruvchining o'z client qatori bor mock uchun ma'lumot qaytaradi.
            // Ilgari bu yerda "eng oxirgi aktiv mock" fallback'i bor edi - u ixtiyoriy mockni
            // tanlab, boshqa test natijalarini ko'rsatishi mumkin edi; olib tashlandi.
            if (!client.mock_test_id) {
                throw new Error('This booking is not linked to a mock test');
            }

            const { data: sectionsData, error: mockTestError } = await supabase
                .rpc('get_mock_test_sections_for_own_client', { p_mock_test_id: client.mock_test_id });

            if (mockTestError) throw mockTestError;

            const mockTest = Array.isArray(sectionsData) ? sectionsData[0] : sectionsData;
            if (!mockTest) {
                throw new Error('Mock test not found');
            }

            const { listening_id, reading_id, writing_id } = mockTest;

            // 3. Get user attempts for this user and mock test
            // mock_id references mock_test.id, not mock_test_clients.id
            let { data: attempts, error: attemptsError } = await supabase
                .from('user_attempts')
                .select(`
                    id,
                    test_id,
                    writing_id,
                    score,
                    feedback,
                    correct_answers,
                    total_questions,
                    time_taken,
                    completed_at,
                    mock_id
                `)
                .eq('user_id', userId)
                .eq('mock_id', mockTest.id);

            if (attemptsError) throw attemptsError;

            // If no attempts found with mock_id, try fallback: get attempts matching test IDs
            // This handles cases where attempts might not have mock_id set
            if (!attempts || attempts.length === 0) {
                
                // Get recent attempts for user and filter by test IDs in memory (limit to reduce egress)
                const { data: allAttempts, error: allAttemptsError } = await supabase
                    .from('user_attempts')
                    .select(`
                        id,
                        test_id,
                        writing_id,
                        score,
                        feedback,
                        correct_answers,
                        total_questions,
                        time_taken,
                        completed_at,
                        mock_id
                    `)
                    .eq('user_id', userId)
                    .order('completed_at', { ascending: false })
                    .limit(100);

                if (allAttemptsError) {
                    console.warn('Error fetching fallback attempts:', allAttemptsError);
                } else if (allAttempts) {
                    // Filter attempts to only those matching mock test IDs
                    const testIdsToMatch = [listening_id, reading_id].filter(Boolean);
                    const writingIdsToMatch = [writing_id].filter(Boolean);
                    
                    attempts = allAttempts.filter(attempt => {
                        const attemptTestId = attempt.test_id?.toString();
                        const attemptWritingId = attempt.writing_id?.toString();
                        
                        const matchesTestId = testIdsToMatch.some(id => id?.toString() === attemptTestId);
                        const matchesWritingId = writingIdsToMatch.some(id => id?.toString() === attemptWritingId);
                        
                        return matchesTestId || matchesWritingId;
                    });
                                    }
            }

    

            // 4. Get test IDs from attempts and fetch their types from test table
            const testIds = attempts
                ?.filter(a => a.test_id)
                .map(a => a.test_id) || [];
            
            // Create a map of test_id -> test_type
            const testTypeMap = {};
            if (testIds.length > 0) {
                const { data: tests, error: testsError } = await supabase
                    .from('test')
                    .select('id, type')
                    .in('id', testIds);
                
                if (testsError) {
                    console.warn('Error fetching test types:', testsError);
                } else if (tests) {
                    tests.forEach(test => {
                        testTypeMap[test.id] = test.type;
                    });
                }
            }

            // 5. Map attempts to listening, reading, writing, and speaking
            // Match by test type instead of exact ID, since attempts may have different test IDs
            // but should still be associated with the correct mock test via mock_id
            
            let listening = null;
            let reading = null;
            let writing = null;
            let speaking = null;

            attempts?.forEach(attempt => {
                // Writing attempts have writing_id but no test_id
                if (attempt.writing_id && !attempt.test_id) {
                    if (!writing) {
                        writing = attempt;
                    }
                }
                // Other attempts have test_id - match by type
                else if (attempt.test_id) {
                    const testType = testTypeMap[attempt.test_id];
                    
                    if (testType === 'listening' && !listening) {
                        listening = attempt;
                    } else if (testType === 'reading' && !reading) {
                        reading = attempt;
                    } else if (testType === 'speaking' && !speaking) {
                        speaking = attempt;
                    }
                }
            });


            const result = {
                client,
                mockTest,
                results: {
                    listening,
                    reading,
                    writing,
                    speaking,
                }
            };

            set({ loading: false });
            return result;
        } catch (err) {
            set({ 
                error: err.message || 'Failed to fetch client attempts', 
                loading: false 
            });
            throw err;
        }
    },

    /**
     * Fetch all active mock tests
     * @returns {Promise<Array>} Array of mock tests
     */
    fetchAllMockTests: async () => {
        set({ loading: true, error: null });

        try {
            // Ro'yxat uchun faqat id/title kerak. Parol ham, bo'limlar id'si ham yuborilmaydi -
            // ularni olish uchun parol talab qilinadi (get_mock_test_for_attempt).
            const { data, error } = await supabase.rpc("list_active_mock_tests");

            if (error) throw error;

            set({ loading: false });
            return data || [];
        } catch (err) {
            set({ 
                error: err.message || 'Failed to fetch mock tests', 
                loading: false 
            });
            return [];
        }
    },

    /**
     * Create a mock_test_clients row for a user + mock test (e.g. when they enter via password and no row exists).
     * Call this so status can be updated to 'started' when they start the listening video.
     * @param {string} userId - auth.users id
     * @param {string} mockTestId - mock_test id
     * @param {{ full_name: string, email: string, phone_number?: string|null }} profile - required full_name, email
     * @returns {Promise<object|null>} Created client or null on error
     */
    createClientForMockTest: async (userId, mockTestId, profile) => {
        if (!userId || !mockTestId) return null;
        const fullName = profile?.full_name ?? 'User';
        const email = (profile?.email && String(profile.email).trim()) || null;
        if (!email) {
            console.error('[mockTestClientStore] createClientForMockTest: email is required');
            return null;
        }
        try {
            const { data, error } = await supabase
                .from("mock_test_clients")
                .insert({
                    user_id: userId,
                    mock_test_id: mockTestId,
                    full_name: fullName,
                    email: email,
                    phone_number: profile?.phone_number ?? null,
                    status: 'booked',
                    updated_at: new Date().toISOString(),
                })
                .select("id, status, created_at, mock_test_id")
                .single();
            if (error) throw error;
            set({ client: data });
            return data;
        } catch (err) {
            console.error('Error creating mock test client:', err);
            return null;
        }
    },

    /**
     * Find the client record that belongs to a specific mock test
     * Uses mock_test_id directly from mock_test_clients table
     * @param {string} userId - The user ID
     * @param {string} mockTestId - The mock test ID
     * @returns {Promise<{client: object|null, status: string|null}>} Client record and status
     */
    findClientForMockTest: async (userId, mockTestId) => {
        try {
            // Query mock_test_clients directly using mock_test_id
            const { data: client, error: clientError } = await supabase
                .from("mock_test_clients")
                .select("id, status, created_at, mock_test_id")
                .eq("user_id", userId)
                .eq("mock_test_id", mockTestId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (clientError) throw clientError;

            if (client) {
                return { client, status: client.status };
            }

            return { client: null, status: null };
        } catch (err) {
            console.error('Error finding client for mock test:', err);
            return { client: null, status: null };
        }
    },

    /**
     * Check if user has completed a mock test
     * @param {string} userId - The user ID
     * @param {string} mockTestId - The mock test ID
     * @returns {Promise<boolean>} True if user has completed the mock test
     */
    hasUserCompletedMockTest: async (userId, mockTestId) => {
        try {
            const { client, status } = await useMockTestClientStore.getState().findClientForMockTest(userId, mockTestId);
            
            // User has completed if client exists and status is completed, checked, or notified
            return !!client && ['completed', 'checked', 'notified'].includes(status);
        } catch (err) {
            console.error('Error checking mock test completion:', err);
            return false;
        }
    }

}));

