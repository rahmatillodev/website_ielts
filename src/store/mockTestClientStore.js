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
                .select(`
            id,
            user_id,
            full_name,
            email,
            phone_number,
            date,
            time,
            status,
            total_score,
            created_at,
            updated_at
          `)
                .eq("user_id", clientId)
                .single();

            if (error) throw error;

            set({ client: data, loading: false });
            return data;
        } catch (err) {
            set({ error: err.message || "Failed to fetch client", loading: false });
            return null;
        }
    },

    fetchMockTestByPassword: async (passwordCode) => {
        console.log("fetchMockTestByPassword type", typeof passwordCode, passwordCode);
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

    fetchMockTestByUserId: async (userId) => {
        set({ loading: true, error: null });

        try {
            // First, get the client
            const client = await useMockTestClientStore.getState().fetchClientById(userId);
            if (!client) {
                throw new Error("Client not found");
            }

            // Then, fetch the mock_test associated with this client
            // Since there's no direct FK, we'll query mock_test where is_active = true
            // and match by date or find the active mock test
            // For now, we'll fetch the most recent active mock_test
            // In production, you may need to add a mock_test_id to mock_test_clients
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
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    updateClientStatus: async (clientId, status) => {
        try {
            const { error } = await supabase
                .from("mock_test_clients")
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq("id", clientId);

            if (error) throw error;

            // Update local client state if it matches
            const currentState = useMockTestClientStore.getState();
            if (currentState.client && currentState.client.id === clientId) {
                set({ client: { ...currentState.client, status } });
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
}));



// Legacy function - use store method instead
export async function fetchMockTestByPassword(passwordCode) {
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
        .maybeSingle();

    if (error) throw error;
    return data;
}
