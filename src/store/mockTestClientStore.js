import { create } from "zustand";
import supabase from "@/lib/supabase";

export const useMockTestClientStore = create((set) => ({
    client: null,
    mockTest: null,
    loading: false,
    error: null,

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

    fetchMockTestByPassword: async (passwordCode) => {
        set({ loading: true, error: null });

        try {
            const { data, error } = await supabase
                .from("mock_test")
                .select(`
                    id,
                    writing_id,
                    listening_id,
                    reading_id,
                    password_code,
                    is_active,
                    created_at
                `)
                .eq("is_active", true)
                .eq("password_code", passwordCode)
                .single();

            if (error) throw error;

            if (!data) {
                throw new Error("Mock test not found with the provided password code");
            }

            set({ mockTest: data, loading: false });
            return data;
        } catch (err) {
            set({ error: err.message || "Failed to fetch mock test", loading: false });
            return null;
        }
    },

    fetchMockTestById: async (mockTestId) => {
        set({ loading: true, error: null });

        try {
            const { data, error } = await supabase
                .from("mock_test")
                .select(`
                    id,
                    writing_id,
                    listening_id,
                    reading_id,
                    password_code,
                    is_active,
                    created_at
                `)
                .eq("id", mockTestId)
                .eq("is_active", true)
                .single();

            if (error) throw error;

            if (!data) {
                throw new Error("Mock test not found");
            }

            set({ mockTest: data, loading: false });
            return data;
        } catch (err) {
            set({ error: err.message || "Failed to fetch mock test", loading: false });
            return null;
        }
    },

    fetchMockTestByUserId: async (userId) => {
        set({ loading: true, error: null });

        try {
            // First, get the client
            const client = await useMockTestClientStore.getState().fetchClientById(userId);
            if (!client) {
                throw new Error("Client not found");
            }

            // Then, fetch the mock_test associated with this client using mock_test_id
            if (client.mock_test_id) {
                const { data, error } = await supabase
                    .from("mock_test")
                    .select(`
                        id,
                        writing_id,
                        listening_id,
                        reading_id,
                        password_code,
                        is_active,
                        created_at
                    `)
                    .eq("id", client.mock_test_id)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    set({ mockTest: data, loading: false });
                    return data;
                }
            }

            // Fallback: fetch the most recent active mock_test if client doesn't have mock_test_id
            const { data, error } = await supabase
                .from("mock_test")
                .select(`
                    id,
                    writing_id,
                    listening_id,
                    reading_id,
                    password_code,
                    is_active,
                    created_at
                `)
                .eq("is_active", true)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                throw new Error("No active mock test found");
            }

            set({ mockTest: data, loading: false });
            return data;
        } catch (err) {
            set({ error: err.message || "Failed to fetch mock test", loading: false });
            return null;
        }
    },

    /**
     * Update mock_test_clients status
     * @param {string} clientId - The mock test client ID
     * @param {string} status - New status: 'booked' | 'started' | 'completed'
     * @param {string} mockTestId - Optional mock test ID to set when status is 'started'
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    updateClientStatus: async (clientId, status, mockTestId = null) => {
        try {
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            // Set mock_test_id when status is 'started' if provided
            if (status === 'started' && mockTestId) {
                updateData.mock_test_id = mockTestId;
            }

            const { error } = await supabase
                .from("mock_test_clients")
                .update(updateData)
                .eq("id", clientId);

            if (error) throw error;

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

            // 2. Get the mock_test using client's mock_test_id or fallback to active mock test
            let mockTest;
            if (client.mock_test_id) {
                const { data: mockTestData, error: mockTestError } = await supabase
                    .from('mock_test')
                    .select('id, listening_id, reading_id, writing_id, is_active')
                    .eq('id', client.mock_test_id)
                    .maybeSingle();

                if (mockTestError) throw mockTestError;
                mockTest = mockTestData;
            }

            // Fallback: Get the active mock_test if client doesn't have mock_test_id
            if (!mockTest) {
                const { data: mockTestData, error: mockTestError } = await supabase
                    .from('mock_test')
                    .select('id, listening_id, reading_id, writing_id, is_active')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (mockTestError) throw mockTestError;
                if (!mockTestData) {
                    throw new Error('Active mock test not found');
                }
                mockTest = mockTestData;
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
                
                // Get all attempts for user and filter by test IDs in memory
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
                    .order('completed_at', { ascending: false });

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
            const { data, error } = await supabase
                .from("mock_test")
                .select(`
                    id,
                    title,
                    password_code,
                    is_active,
                    created_at,
                    writing_id,
                    listening_id,
                    reading_id
                `)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

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

