import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMockTestClientStore } from '@/store/mockTestClientStore';
import { useAuthStore } from '@/store/authStore';
import { saveMockTestData, loadMockTestData, clearMockTestData, clearAllMockTestDataForId } from '@/store/LocalStorage/mockTestStorage';
import MockTestListening from './MockTestListening';
import MockTestReading from './MockTestReading';
import MockTestWriting from './MockTestWriting';
import MockTestResults from './MockTestResults';
import MockTestStart from './MockTestStart';
import InstructionalVideo from '@/components/mock/InstructionalVideo';

/**
 * Main orchestrator component for the mock test flow
 * Manages transitions between Listening, Reading, and Writing sections
 */
const MockTestFlow = () => {
  const { mockTestId: paramMockTestId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { fetchMockTestByUserId, fetchMockTestById, mockTest, client, loading, error, updateClientStatus, hasUserCompletedMockTest } = useMockTestClientStore();

  const [currentSection, setCurrentSection] = useState('audioCheck'); // 'audioCheck' | 'intro' | 'listening' | 'reading' | 'writing' | 'results'
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [audioCheckComplete, setAudioCheckComplete] = useState(false);
  const [sectionResults, setSectionResults] = useState({
    listening: null,
    reading: null,
    writing: null,
  });

  // Load mock test data on mount
  useEffect(() => {
    if (paramMockTestId) {
      // If mockTestId is in route params (accessed via password), fetch by ID
      fetchMockTestById(paramMockTestId);
    } else if (userProfile?.id) {
      // Otherwise, use the old method for backward compatibility
      fetchMockTestByUserId(userProfile.id);
    }
  }, [paramMockTestId, userProfile?.id, fetchMockTestById, fetchMockTestByUserId]);

  // Check if user has already completed the mock test after it's loaded
  useEffect(() => {
    const checkCompletion = async () => {
      if (!userProfile?.id || !mockTest?.id) return;
      
      const hasCompleted = await hasUserCompletedMockTest(userProfile.id, mockTest.id);
      if (hasCompleted) {
        // User has already completed this test, redirect to mock tests page
        navigate('/mock-tests', { 
          replace: true,
          state: { 
            error: 'You have already completed this mock test. You cannot access it again.' 
          }
        });
      }
    };
    
    checkCompletion();
  }, [userProfile?.id, mockTest?.id, hasUserCompletedMockTest, navigate]);

  // Use param mockTestId if available, otherwise use fetched mockTest
  const effectiveMockTestId = paramMockTestId || mockTest?.id;

  // Load saved progress
  useEffect(() => {
    if (effectiveMockTestId) {
      const savedData = loadMockTestData(effectiveMockTestId);
      if (savedData) {
        // Restore section state (but skip audioCheck if already completed)
        if (savedData.currentSection && savedData.currentSection !== 'audioCheck') {
          setCurrentSection(savedData.currentSection);
          // If we're past audioCheck, mark it as complete
          if (savedData.currentSection !== 'intro') {
            setAudioCheckComplete(true);
            setShowIntroVideo(false); // Don't show intro video again
          }
        }
        // Restore results
        if (savedData.sectionResults) {
          setSectionResults(savedData.sectionResults);
        }
      }
    }
  }, [effectiveMockTestId]);

  // Save progress whenever section or results change
  useEffect(() => {
    if (effectiveMockTestId && currentSection !== 'intro') {
      saveMockTestData(effectiveMockTestId, {
        currentSection,
        sectionResults,
        mockTestId: effectiveMockTestId,
      });
    }
  }, [currentSection, sectionResults, effectiveMockTestId]);

  const handleIntroVideoComplete = async () => {
    setShowIntroVideo(false);
    
    // Update mock_test_clients status to 'started' when test begins (listening is first section)
    if (client?.id) {
      try {
        await updateClientStatus(client.id, 'started');
        console.log('[MockTestFlow] Mock test client status updated to started');
      } catch (err) {
        console.error('[MockTestFlow] Error updating mock test client status to started:', err);
        // Don't block navigation if status update fails
      }
    }
    
    setCurrentSection('listening');
  };

  const handleListeningComplete = (result) => {
    const updatedResults = {
      ...sectionResults,
      listening: result,
    };
    setSectionResults(updatedResults);
    setCurrentSection('reading');
  };

  const handleReadingComplete = (result) => {
    const updatedResults = {
      ...sectionResults,
      reading: result,
    };
    setSectionResults(updatedResults);
    setCurrentSection('writing');
  };

  const handleWritingComplete = async (result) => {
    console.log('[MockTestFlow] Writing completed, result:', result);
    const updatedResults = {
      ...sectionResults,
      writing: result,
    };
    setSectionResults(updatedResults);
    
    // Update mock_test_clients status to 'completed' when all sections are done
    // Try to get client ID from component state, or from store if not available
    let clientIdToUpdate = client?.id;
    if (!clientIdToUpdate) {
      // Try to get from store
      const storeState = useMockTestClientStore.getState();
      clientIdToUpdate = storeState.client?.id;
    }
    
    if (clientIdToUpdate) {
      try {
        const updateResult = await updateClientStatus(clientIdToUpdate, 'completed');
        if (updateResult.success) {
          console.log('[MockTestFlow] Mock test client status updated to completed');
        } else {
          console.error('[MockTestFlow] Failed to update status:', updateResult.error);
        }
      } catch (err) {
        console.error('[MockTestFlow] Error updating mock test client status to completed:', err);
        // Don't block navigation if status update fails
      }
    } else {
      console.warn('[MockTestFlow] Cannot update status to completed: client.id is not available in state or store');
    }
    
    // Clear all mock test data from localStorage after all sections are completed
    // This includes main progress data and all completion signals
    if (effectiveMockTestId) {
      console.log('[MockTestFlow] Clearing all localStorage data for mock test:', effectiveMockTestId);
      clearAllMockTestDataForId(effectiveMockTestId);
    }
    
    // Navigate to results page
    setCurrentSection('results');
    console.log('[MockTestFlow] Navigating to results page');
  };

  // Handler for early exit - navigates to results with only completed sections
  // Only the completed section's result is saved; skipped sections remain null
  const handleEarlyExit = (result, section) => {
    console.log('[MockTestFlow] Early exit triggered, navigating to results with completed sections only', { section, result });
    
    // Save the result for the current section if provided
    // This ensures only completed sections have results; skipped sections will be null
    if (result && section) {
      const updatedResults = {
        ...sectionResults,
        [section]: result,
      };
      setSectionResults(updatedResults);
    }
    
    // Clear all mock test data from localStorage (including any partial progress for skipped sections)
    // This ensures no data is saved for sections that were skipped
    if (effectiveMockTestId) {
      console.log('[MockTestFlow] Clearing all localStorage data for mock test:', effectiveMockTestId);
      clearAllMockTestDataForId(effectiveMockTestId);
    }
    
    // Navigate to results page with current section results
    // Only completed sections will have results; skipped sections (reading/writing) will be null
    setCurrentSection('results');
  };

  const handleAudioCheckComplete = () => {
    setAudioCheckComplete(true);
    setShowIntroVideo(true);
    setCurrentSection('intro');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mock test...</p>
        </div>
      </div>
    );
  }

  if (error || !mockTest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Mock test not found'}</p>
          <button
            onClick={() => navigate('/mock-tests')}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Back to Mock Tests
          </button>
        </div>
      </div>
    );
  }

  // Show audio check first - only if not already completed
  if (currentSection === 'audioCheck' && !audioCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <MockTestStart onStart={handleAudioCheckComplete} />
      </div>
    );
  }

  // Show intro video after audio check
  // Check both showIntroVideo flag and currentSection to ensure video shows
  if ((showIntroVideo || currentSection === 'intro') && audioCheckComplete) {
    return (
      <InstructionalVideo
        onComplete={handleIntroVideoComplete}
        countdownSeconds={0}
        title="Welcome to the Mock Test"
        description="This test consists of three sections: Listening, Reading, and Writing. Please follow the instructions carefully."
        autoFullscreen={true}
        onExit={() => {
          setShowIntroVideo(false);
          setCurrentSection('audioCheck');
          navigate('/mock-tests');
        }}
      />
    );
  }

  // Render current section
  switch (currentSection) {
    case 'listening':
      return (
        <MockTestListening
          testId={mockTest.listening_id}
          mockTestId={mockTest.id}
          mockClientId={client?.id}
          onComplete={handleListeningComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
        />
      );

    case 'reading':
      return (
        <MockTestReading
          testId={mockTest.reading_id}
          mockTestId={mockTest.id}
          mockClientId={client?.id}
          onComplete={handleReadingComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
        />
      );

    case 'writing':
      return (
        <MockTestWriting
          writingId={mockTest.writing_id}
          mockTestId={mockTest.id}
          mockClientId={client?.id}
          onComplete={handleWritingComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
        />
      );

    case 'results':
      return (
        <MockTestResults
          results={sectionResults}
          mockTestId={effectiveMockTestId}
          onBack={() => navigate('/mock-tests')}
        />
      );

    default:
      // If we're in a section that should show audio check, show it
      // Otherwise, show audio check as default/fallback only if not already completed
      if (!audioCheckComplete) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <MockTestStart onStart={handleAudioCheckComplete} />
          </div>
        );
      }
      // If audio check is complete but we're in an unknown section, go to listening
      return (
        <MockTestListening
          testId={mockTest.listening_id}
          mockTestId={mockTest.id}
          mockClientId={client?.id}
          onComplete={handleListeningComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
        />
      );
  }
};

export default MockTestFlow;

