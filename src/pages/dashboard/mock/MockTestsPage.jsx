import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useMockTestClientStore } from "@/store/mockTestClientStore";
import { useMockTests } from "@/hooks/useMockTests";
import {  MdHistory } from "react-icons/md";
import MockTestPasswordModal from "@/components/modal/MockTestPasswordModal";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

const MockTestsPage = () => {
  const { 
    fetchClientById, 
    fetchClientAttempts, 
    loading,
    isMockTestClient,
  } = useMockTestClientStore();
  const { userProfile } = useAuthStore();
  
  const {
    mockTests,

    loading: mockTestsLoading,
    verifyPassword,
  } = useMockTests();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handlePasswordChange = (value) => {
    setPasswordCode(value);
    setPasswordError(''); // Clear error when user types
  };

  const handlePasswordSubmit = async () => {
    if (!passwordCode || passwordCode.trim() === '') {
      setPasswordError('Please enter a password code');
      return;
    }

    setIsSubmitting(true);
    setPasswordError('');

    try {
      const result = await verifyPassword(passwordCode.trim());
      
      if (result.success && result.mockTest) {
        // Close modal and navigate to the mock test flow
        setIsPasswordModalOpen(false);
        setPasswordCode('');
        setPasswordError('');
        navigate(`/mock-test/flow/${result.mockTest.id}`);
      } else {
        setPasswordError(result.error || 'Invalid password code. Please try again.');
      }
    } catch (err) {
      console.error('Password verification error:', err);
      setPasswordError('Failed to verify password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordModalClose = () => {
    setIsPasswordModalOpen(false);
    setPasswordCode('');
    setPasswordError('');
  };

  const [results, setResults] = useState({
    listening: null,
    reading: null,
    writing: null
  });

  // Load results for existing client (backward compatibility)
  useEffect(() => {
    const loadResults = async () => {
      if (userProfile?.id) {
        try {
          const data = await fetchClientAttempts(userProfile.id);
          if (data?.results) {
            setResults(data.results);
          }
        } catch (err) {
          console.error('Failed to load results:', err);
        }
      }
    };

    loadResults();
  }, [userProfile?.id, fetchClientAttempts]);

  // Load client for backward compatibility
  useEffect(() => {
    if (userProfile?.id) {
      fetchClientById(userProfile.id);
    }
  }, [userProfile?.id, fetchClientById]);

  // Display error message from navigation state (e.g., when redirected from MockTestFlow)
  useEffect(() => {
    if (location.state?.error) {
      toast.error(location.state.error);
      // Clear the state to prevent showing the error again on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);



  // const handleStartTest = () => {
  //   setShowStartModal(false);
  //   // Navigate to mock test flow; pass state so flow skips device check and shows intro video
  //   if (mockTest?.id) {
  //     navigate(`/mock-test/flow/${mockTest.id}`, { state: { audioCheckDone: true } });
  //   } else {
  //     console.error('Mock test not found');
  //     alert('Mock test configuration not found. Please contact support.');
  //   }
  // };
 




  // Note: Backward compatibility logic removed
  // The "Wait for Result" message is now shown in the card itself
  // Users can see all mock tests and their status in the list/grid view

  if ((loading || mockTestsLoading) && mockTests.length === 0) {
    return (
      <div className="text-center py-10 w-full h-full max-w-7xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading mock tests...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50" style={{height: 'calc(100vh - 64px)'}}>
      <div className="max-w-7xl mx-auto py-6 h-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Mock Tests
          </h1>
          <p className="text-gray-600">
            Practice with full-length mock tests. Each test can only be taken once.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isMockTestClient === true && (
            <Link
              to="/mock-test/history"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
            >
              <MdHistory className="text-lg" />
              History
            </Link>
          )}
        </div>
      </div>

      {/* Mock Tests List/Grid */}
      {mockTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500 text-lg mb-4">No mock tests available</p>
          <p className="text-gray-400 text-sm">Check back later for new mock tests.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-24">
          {/* // view password modal */}
          <Button onClick={() => setIsPasswordModalOpen(true)} className="w-full max-w-md px-4 py-6 text-lg">
            Enter Password to Start Test
          </Button>
        </div>
      )}

      <MockTestPasswordModal
        isOpen={isPasswordModalOpen}
        passwordCode={passwordCode}
        passwordError={passwordError}
        isSubmitting={isSubmitting}
        onPasswordChange={handlePasswordChange}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordModalClose}
      />
    </div>
    </div>

  );
};

export default MockTestsPage;
