import { useState, useEffect, useCallback } from 'react';
import { useMockTestClientStore } from '@/store/mockTestClientStore';
import { useAuthStore } from '@/store/authStore';
import supabase from '@/lib/supabase';
import { toast } from 'react-toastify';

/**
 * Custom hook for managing mock tests list and operations
 * Separates business logic from UI components
 */
export const useMockTests = () => {
  const { 
    fetchAllMockTests,
    hasUserCompletedMockTest,
    fetchMockTestByPassword,
    mockTest
  } = useMockTestClientStore();
  const { userProfile } = useAuthStore();

  const [mockTests, setMockTests] = useState([]);
  const [completionStatus, setCompletionStatus] = useState({});
  const [clientStatusMap, setClientStatusMap] = useState({}); // Map of mockTestId -> client status
  const [clientIdMap, setClientIdMap] = useState({}); // Map of mockTestId -> clientId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all mock tests
  const loadMockTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tests = await fetchAllMockTests();
      setMockTests(tests || []);
    } catch (err) {
      console.error('Failed to load mock tests:', err);
      setError(err.message || 'Failed to load mock tests');
      toast.error('Failed to load mock tests');
    } finally {
      setLoading(false);
    }
  }, [fetchAllMockTests]);

  // Load completion status and client status for each mock test
  const loadCompletionStatus = useCallback(async () => {
    if (!userProfile?.id || mockTests.length === 0) return;

    const statusMap = {};
    const clientStatusMap = {};
    const clientIdMap = {};
    
    try {
      // Fetch all client records for this user (all statuses) with mock_test_id
      const { data: clients, error: clientsError } = await supabase
        .from('mock_test_clients')
        .select('id, status, created_at, mock_test_id')
        .eq('user_id', userProfile.id)
        .in('status', ['booked', 'started', 'completed', 'checked', 'notified'])
        .not('mock_test_id', 'is', null)
        .order('created_at', { ascending: false });

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
      }

      // Create a map of mock_test_id -> client for quick lookup
      const clientByMockTestId = {};
      if (clients) {
        clients.forEach(client => {
          if (client.mock_test_id) {
            // If multiple clients exist for same mock_test_id, keep the most recent
            if (!clientByMockTestId[client.mock_test_id] || 
                new Date(client.created_at) > new Date(clientByMockTestId[client.mock_test_id].created_at)) {
              clientByMockTestId[client.mock_test_id] = client;
            }
          }
        });
      }
      
      // For each mock test, find the matching client using mock_test_id
      for (const test of mockTests) {
        const client = clientByMockTestId[test.id];
        
        if (client) {
          // User has a client record for this mock test
          const completed = ['completed', 'checked', 'notified'].includes(client.status);
          statusMap[test.id] = completed;
          clientStatusMap[test.id] = client.status;
          clientIdMap[test.id] = client.id;
        } else {
          // No client record found for this specific mock test
          statusMap[test.id] = false;
          clientStatusMap[test.id] = null;
          clientIdMap[test.id] = null;
        }
      }
      
      setCompletionStatus(statusMap);
      setClientStatusMap(clientStatusMap);
      setClientIdMap(clientIdMap);
    } catch (err) {
      console.error('Error loading completion status:', err);
    }
  }, [userProfile?.id, mockTests]);

  // Verify password and return mock test if valid
  // Accepts any password that matches any active mock test
  // Prevents access if user has already completed the test
  const verifyPassword = useCallback(async (passwordCode) => {
    if (!passwordCode || passwordCode.trim() === '') {
      return { success: false, error: 'Please enter a password code' };
    }

    try {
      const result = await fetchMockTestByPassword(passwordCode.trim());
      
      if (result) {
        // Check if user has already completed this mock test
        if (userProfile?.id) {
          const hasCompleted = await hasUserCompletedMockTest(userProfile.id, result.id);
          if (hasCompleted) {
            return { 
              success: false, 
              error: 'You have already completed this mock test. You cannot access it again.' 
            };
          }
        }
        
        return { success: true, mockTest: result };
      } else {
        return { success: false, error: 'Invalid password code. Please try again.' };
      }
    } catch (err) {
      console.error('Password verification error:', err);
      return { success: false, error: err.message || 'Invalid password code. Please try again.' };
    }
  }, [fetchMockTestByPassword, userProfile?.id, hasUserCompletedMockTest]);

  // Load mock tests on mount
  useEffect(() => {
    loadMockTests();
  }, [loadMockTests]);

  // Load completion status when mock tests or user changes
  useEffect(() => {
    loadCompletionStatus();
  }, [loadCompletionStatus]);

  return {
    mockTests,
    completionStatus,
    clientStatusMap,
    clientIdMap,
    loading,
    error,
    verifyPassword,
    currentMockTest: mockTest,
    refreshMockTests: loadMockTests,
  };
};

