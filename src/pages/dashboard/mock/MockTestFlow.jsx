import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useMockTestClientStore } from '@/store/mockTestClientStore';
import { useAuthStore } from '@/store/authStore';
import { saveMockTestData, loadMockTestData, clearAllMockTestDataForId, loadAudioCheckState, saveAudioCheckState } from '@/store/LocalStorage/mockTestStorage';
import { putRunPartial, mergeSection, markRunCompleted } from '@/lib/mockTestIndexedArchive';
import MockTestListening from './MockTestListening';
import MockTestReading from './MockTestReading';
import MockTestWriting from './MockTestWriting';
import MockTestResults from './MockTestResults';
import MockTestStart from './MockTestStart';
import InstructionalVideo from '@/components/mock/InstructionalVideo';
import { toast } from 'react-toastify';

const MOCK_TEST_SESSION_RUN_KEY = 'mock_test_session_run';

const isSectionSubmitSuccess = (result) =>
  result && result.success !== false && result.attemptId != null;

/**
 * Main orchestrator component for the mock test flow
 * Manages transitions between Listening, Reading, and Writing sections
 */
const MockTestFlow = () => {
  const { mockTestId: paramMockTestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuthStore();
  const { fetchMockTestByUserId, fetchMockTestById, mockTest, client, loading, error, updateClientStatus, findClientForMockTest, fetchClientById, createClientForMockTest } = useMockTestClientStore();
  const appliedAudioCheckDoneRef = useRef(false);
  const restorationAttemptedRef = useRef(false);

  const [currentSection, setCurrentSection] = useState('audioCheck'); // 'audioCheck' | 'listening' | 'reading' | 'writing' | 'results'
  const [audioCheckComplete, setAudioCheckComplete] = useState(false);
  /** When restoring progress, show intro video first then go to this section */
  const [sectionResults, setSectionResults] = useState({
    listening: null,
    reading: null,
    writing: null,
  });

  /** IndexedDB archive run id (persisted in sessionStorage for practice-page navigations). */
  const [mockRunId, setMockRunId] = useState(null);

  const listeningVideoSrc = "/videos/listeningVideo.mp4";
  const readingVideoSrc = "/videos/readingVideo.mp4";
  const writingVideoSrc = "/videos/writingVideo.mp4";

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

  // Fetch or create client when mock test is loaded (so status can be updated to 'started' when video starts)
  useEffect(() => {
    const loadClient = async () => {
      if (!mockTest?.id || !userProfile?.id) return;

      const currentState = useMockTestClientStore.getState();
      if (currentState.client?.mock_test_id === mockTest.id) return;

      try {
        const { client: foundClient } = await findClientForMockTest(userProfile.id, mockTest.id);

        if (foundClient) {
          useMockTestClientStore.setState({ client: foundClient });
          return;
        }

        // Use existing client for this user (e.g. booking row with mock_test_id null) — we'll set mock_test_id when updating to 'started'
        const clientByUserId = await fetchClientById(userProfile.id);
        if (clientByUserId) {
          useMockTestClientStore.setState({ client: clientByUserId });
          return;
        }

        // No client at all: create one so we can set status to 'started' when they start the video
        const fullName = userProfile.full_name ?? userProfile.username ?? 'User';
        const email = (userProfile.email && String(userProfile.email).trim()) || null;
        if (!email) {
          console.warn('[MockTestFlow] Cannot create client: user profile has no email');
          return;
        }
        const newClient = await createClientForMockTest(userProfile.id, mockTest.id, {
          full_name: fullName,
          email,
          phone_number: userProfile.phone_number ?? null,
        });
        if (newClient) {
          useMockTestClientStore.setState({ client: newClient });
        }
      } catch (err) {
        console.error('[MockTestFlow] Error loading client:', err);
      }
    };

    loadClient();
  }, [mockTest?.id, userProfile?.id, userProfile?.email, userProfile?.full_name, userProfile?.phone_number, findClientForMockTest, fetchClientById, createClientForMockTest]);

  // Check if user has already completed the mock test after it's loaded
  // useEffect(() => {
  //   const checkCompletion = async () => {
  //     if (!userProfile?.id || !mockTest?.id) return;
      
  //     const hasCompleted = await hasUserCompletedMockTest(userProfile.id, mockTest.id);
  //     if (hasCompleted) {
  //       // User has already completed this test, redirect to mock tests page
  //       navigate('/mock-tests', { 
  //         replace: true,
  //         state: { 
  //           error: 'You have already completed this mock test. You cannot access it again.' 
  //         }
  //       });
  //     }
  //   };
    
  //   checkCompletion();
  // }, [userProfile?.id, mockTest?.id, hasUserCompletedMockTest, navigate]);

  // Use param mockTestId if available, otherwise use fetched mockTest
  const effectiveMockTestId = paramMockTestId || mockTest?.id;

  // One run per mock session (reuse on refresh while same user + same mock test).
  useEffect(() => {
    if (!effectiveMockTestId || !userProfile?.id || !mockTest?.id) return;
    try {
      const raw = sessionStorage.getItem(MOCK_TEST_SESSION_RUN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.mockTestId === effectiveMockTestId && parsed?.userId === userProfile.id && parsed?.runId) {
          setMockRunId(parsed.runId);
          return;
        }
      }
    } catch (_) {
      /* ignore */
    }
    const runId = uuidv4();
    try {
      sessionStorage.setItem(
        MOCK_TEST_SESSION_RUN_KEY,
        JSON.stringify({ mockTestId: effectiveMockTestId, userId: userProfile.id, runId })
      );
    } catch (_) {
      /* ignore */
    }
    setMockRunId(runId);
  }, [effectiveMockTestId, userProfile?.id, mockTest?.id]);

  // Seed IndexedDB archive row (parallel to Supabase; safe no-op on failure).
  useEffect(() => {
    if (!mockRunId || !mockTest?.id || !userProfile?.id) return;
    putRunPartial(mockRunId, {
      user: {
        id: userProfile.id,
        email: userProfile.email ?? null,
        username: userProfile.full_name ?? userProfile.username ?? null,
      },
      mockTest: { id: mockTest.id, title: mockTest.title ?? null },
      sections: {
        listening: {
          testId: mockTest.listening_id ?? null,
          title: null,
          type: 'listening',
        },
        reading: {
          testId: mockTest.reading_id ?? null,
          title: null,
          type: 'reading',
        },
        writing: {
          testId: mockTest.writing_id ?? null,
          title: null,
          type: 'writing',
        },
      },
    });
  }, [mockRunId, mockTest?.id, mockTest?.title, mockTest?.listening_id, mockTest?.reading_id, mockTest?.writing_id, userProfile?.id, userProfile?.email, userProfile?.full_name, userProfile?.username]);

  // When coming from MockTestsPage after device check: skip device check and go to listening
  useEffect(() => {
    if (appliedAudioCheckDoneRef.current) return;
    if (location.state?.audioCheckDone) {
      appliedAudioCheckDoneRef.current = true;
      setAudioCheckComplete(true);
      setCurrentSection('listening');
    }
  }, [location.state]);

  // Load saved progress
  useEffect(() => {
    if (appliedAudioCheckDoneRef.current) {
      restorationAttemptedRef.current = true;
      return;
    }

    if (!effectiveMockTestId) {
      return;
    }

    // Check for completion signals BEFORE restoring state
    // This prevents restoring to a section that was just completed
    const writingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_writing_completed`);
    const readingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_reading_completed`);
    const listeningCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_listening_completed`);

    const savedData = loadMockTestData(effectiveMockTestId);

    // Mark restoration as attempted
    restorationAttemptedRef.current = true;

    // First, check completion signals to determine the correct next section
    // This ensures we advance past completed sections even if saved data is stale
    if (writingCompleted === 'true') {
      setAudioCheckComplete(true);
      setCurrentSection('results');
      if (savedData?.sectionResults) {
        setSectionResults(savedData.sectionResults);
      }
      return;
    }
    if (readingCompleted === 'true') {
      setAudioCheckComplete(true);
      setCurrentSection('writing');
      if (savedData?.sectionResults) {
        setSectionResults(savedData.sectionResults);
      }
      return;
    }
    if (listeningCompleted === 'true') {
      setAudioCheckComplete(true);
      setCurrentSection('reading');
      if (savedData?.sectionResults) {
        setSectionResults(savedData.sectionResults);
      }
      return;
    }

    // Check for saved audio check state
    const audioCheckState = loadAudioCheckState(effectiveMockTestId);
    if (audioCheckState?.completed) {
      // Audio check was already completed, skip it
      setAudioCheckComplete(true);
    }

    if (savedData) {
      // Restore results
      if (savedData.sectionResults) {
        setSectionResults(savedData.sectionResults);
      }

      if (savedData.currentSection) {
        const sec = savedData.currentSection;

        // skip audioCheck if already done
        if (sec === 'audioCheck') {
          // Only show audio check if it wasn't completed
          if (!audioCheckState?.completed) {
            setAudioCheckComplete(false);
            setCurrentSection('audioCheck');
          } else {
            // Audio check was completed, go to listening
            setAudioCheckComplete(true);
            setCurrentSection('listening');
          }
        } else {
          // mark that audio check was done
          setAudioCheckComplete(true);
        }

        // direct restore - skip intro section
        if (sec === 'intro') {
          // Intro section no longer exists, go to listening instead
          setCurrentSection('listening');
        }
        else if (sec === 'listening'
             || sec === 'reading'
             || sec === 'writing'
             || sec === 'results') {
          setCurrentSection(sec);      // restore exact section
        }
      } else if (audioCheckState?.completed) {
        // No saved section but audio check was completed, go to listening
        setCurrentSection('listening');
      }
    } else if (audioCheckState?.completed) {
      // No saved data but audio check was completed, go to listening
      setCurrentSection('listening');
    }
  }, [effectiveMockTestId]);

  // Poll for completion signals when navigating back from practice pages (e.g., after auto-submit)
  // This ensures we detect completion even if the component was already mounted
  useEffect(() => {
    if (!effectiveMockTestId || !restorationAttemptedRef.current) {
      return;
    }

    // Check immediately on mount/navigation
    const checkCompletion = () => {
      const writingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_writing_completed`);
      const readingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_reading_completed`);
      const listeningCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_listening_completed`);

      const savedData = loadMockTestData(effectiveMockTestId);

      // Check completion signals and advance to next section
      if (writingCompleted === 'true' && currentSection !== 'results') {
        setAudioCheckComplete(true);
        setCurrentSection('results');
        if (savedData?.sectionResults) {
          setSectionResults(savedData.sectionResults);
        }
        return true; // Signal that we handled it
      }
      if (readingCompleted === 'true' && currentSection !== 'writing' && currentSection !== 'results') {
        setAudioCheckComplete(true);
        setCurrentSection('writing');
        if (savedData?.sectionResults) {
          setSectionResults(savedData.sectionResults);
        }
        return true;
      }
      if (listeningCompleted === 'true' && currentSection !== 'reading' && currentSection !== 'writing' && currentSection !== 'results') {
        setAudioCheckComplete(true);
        setCurrentSection('reading');
        if (savedData?.sectionResults) {
          setSectionResults(savedData.sectionResults);
        }
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkCompletion()) {
      return; // Already handled, no need to set up polling
    }

    // Set up polling to check for completion signals
    // This is important when auto-submit navigates back to MockTestFlow
    const pollInterval = setInterval(() => {
      if (checkCompletion()) {
        clearInterval(pollInterval);
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(pollInterval);
    };
  }, [effectiveMockTestId, currentSection]);


  // Save progress whenever section or results change
  // IMPORTANT: Don't save until restoration has been attempted to prevent overwriting saved data
  useEffect(() => {
    // Don't save until restoration has been attempted (prevents overwriting saved data on mount)
    if (!restorationAttemptedRef.current) {
      return;
    }

    if (effectiveMockTestId && currentSection !== 'intro') {
      saveMockTestData(effectiveMockTestId, {
        currentSection,
        sectionResults,
        mockTestId: effectiveMockTestId,
      });
    }
  }, [currentSection, sectionResults, effectiveMockTestId]);

  // Handler for when listening video starts - update status to 'started'
  // Status should become 'started' at this point (when user starts the listening instructions video).
  const handleListeningVideoStart = useCallback(async () => {
    const storeState = useMockTestClientStore.getState();
    let clientIdToUpdate = client?.id || storeState.client?.id;
    const mockTestIdToSet = effectiveMockTestId || storeState.mockTest?.id;

    // If no client yet (e.g. loadClient still in progress or create failed), try to create one now
    if (!clientIdToUpdate && mockTestIdToSet && userProfile?.id) {
      const fullName = userProfile.full_name ?? userProfile.username ?? 'User';
      const email = (userProfile.email && String(userProfile.email).trim()) || null;
      if (email) {
        try {
          const newClient = await createClientForMockTest(userProfile.id, mockTestIdToSet, {
            full_name: fullName,
            email,
            phone_number: userProfile.phone_number ?? null,
          });
          if (newClient?.id) clientIdToUpdate = newClient.id;
        } catch (e) {
          console.warn('[MockTestFlow] createClientForMockTest in onVideoStart failed:', e);
        }
      }
    }

    if (clientIdToUpdate && mockTestIdToSet) {
      try {
        const updateResult = await updateClientStatus(clientIdToUpdate, 'started', mockTestIdToSet);
        if (!updateResult.success) {
          console.error('[MockTestFlow] Failed to update status to started:', updateResult.error);
        }
      } catch (err) {
        console.error('[MockTestFlow] Error updating mock test client status to started:', err);
      }
    } else {
      console.warn('[MockTestFlow] Cannot update status to started: client.id or mockTest.id is not available', {
        clientId: clientIdToUpdate,
        mockTestId: mockTestIdToSet,
      });
    }
  }, [client?.id, effectiveMockTestId, updateClientStatus, userProfile?.id, userProfile?.email, userProfile?.full_name, userProfile?.phone_number, createClientForMockTest]);

  const handleListeningComplete = useCallback((result) => {
    if (!isSectionSubmitSuccess(result)) {
      toast.error(result?.error || 'Listening answers were not saved. Please try again.');
      return;
    }
    if (mockRunId && result) {
      mergeSection(mockRunId, 'listening', { submitMeta: result });
    }
    setSectionResults((prevResults) => ({
      ...prevResults,
      listening: result,
    }));
    setCurrentSection('reading');
  }, [mockRunId]);

  const handleReadingComplete = useCallback((result) => {
    if (!isSectionSubmitSuccess(result)) {
      toast.error(result?.error || 'Reading answers were not saved. Please try again.');
      return;
    }
    if (mockRunId && result) {
      mergeSection(mockRunId, 'reading', { submitMeta: result });
    }
    setSectionResults((prevResults) => ({
      ...prevResults,
      reading: result,
    }));
    setCurrentSection('writing');
  }, [mockRunId]);

  const handleWritingComplete = useCallback(async (result) => {
    // Only treat as successful completion if we have a valid result (data was saved to Supabase)
    const isValidResult = isSectionSubmitSuccess(result);
    if (!isValidResult) {
      toast.error(result?.error || 'Writing answers were not saved. Please try again.');
      return;
    }
    setSectionResults((prevResults) => ({
      ...prevResults,
      writing: result ?? prevResults.writing,
    }));

    // Update mock_test_clients status to 'completed' only when we have confirmed successful save
    // (completion signal is only set by WritingPracticePage when submitWritingAttempt succeeds)
    const storeState = useMockTestClientStore.getState();
    let clientIdToUpdate = client?.id || storeState.client?.id;

    if (isValidResult && clientIdToUpdate) {
      try {
        const updateResult = await updateClientStatus(clientIdToUpdate, 'completed');
        if (!updateResult.success) {
          console.error('[MockTestFlow] Failed to update status to completed:', updateResult.error);
        }
      } catch (err) {
        console.error('[MockTestFlow] Error updating mock test client status to completed:', err);
      }
    } else if (!clientIdToUpdate) {
      console.warn('[MockTestFlow] Cannot update status to completed: client.id is not available');
    }

    if (mockRunId) {
      try {
        await markRunCompleted(mockRunId);
        if (result) {
          await mergeSection(mockRunId, 'writing', { submitMeta: result });
        }
      } catch (e) {
        console.warn('[MockTestFlow] IndexedDB archive finalize failed:', e);
      }
      try {
        sessionStorage.removeItem(MOCK_TEST_SESSION_RUN_KEY);
      } catch (_) {
        /* ignore */
      }
    }

    // Clear mock test data and go to results only after writing flow has finished
    // (Storage clear is safe here; completion signals were already consumed by the wrapper)
    const currentMockTestId = paramMockTestId || storeState.mockTest?.id;
    if (currentMockTestId) {
      clearAllMockTestDataForId(currentMockTestId);
    }

    setCurrentSection('results');
  }, [client?.id, paramMockTestId, updateClientStatus, mockRunId]);

  // Handler for early exit ("I Want to Finish"): finish test immediately.
  // - Saves only the current section result (already submitted by practice page); remaining sections are not written.
  // - Sets mock_test_clients status to 'completed' so the test is fully finished.
  // - Clears storage and navigates to results page.
  const handleEarlyExit = useCallback(async (result, section) => {
    if (result && section && !isSectionSubmitSuccess(result)) {
      toast.error(result?.error || 'Your answers were not saved. Please try submitting again.');
      return;
    }
    // Save the result for the current section if provided (only completed sections have results; skipped remain null)
    if (result && section) {
      setSectionResults((prevResults) => ({
        ...prevResults,
        [section]: result,
      }));
    }

    const storeState = useMockTestClientStore.getState();
    const clientIdToUpdate = client?.id || storeState.client?.id;
    const currentMockTestId = paramMockTestId || storeState.mockTest?.id;

    // Mark mock test as completed so user cannot re-enter and so results page shows completed state
    if (clientIdToUpdate) {
      try {
        const updateResult = await updateClientStatus(clientIdToUpdate, 'completed');
        if (!updateResult.success) {
          console.error('[MockTestFlow] Early exit: failed to update status to completed:', updateResult.error);
        }
      } catch (err) {
        console.error('[MockTestFlow] Early exit: error updating mock test client status to completed:', err);
      }
    }

    if (mockRunId) {
      try {
        void markRunCompleted(mockRunId);
        if (result && section) {
          void mergeSection(mockRunId, section, { submitMeta: result });
        }
      } catch (e) {
        console.warn('[MockTestFlow] IndexedDB archive early-exit finalize failed:', e);
      }
      try {
        sessionStorage.removeItem(MOCK_TEST_SESSION_RUN_KEY);
      } catch (_) {
        /* ignore */
      }
    }

    // Clear all mock test data from localStorage (no partial progress for skipped sections)
    if (currentMockTestId) {
      clearAllMockTestDataForId(currentMockTestId);
    }

    setCurrentSection('results');
  }, [paramMockTestId, client?.id, updateClientStatus, mockRunId]);

  const handleAudioCheckComplete = () => {
    // Save audio check completion state
    if (effectiveMockTestId) {
      saveAudioCheckState(effectiveMockTestId, {
        micSuccess: true,
        speakerSuccess: true,
        completed: true,
      });
    }
    setAudioCheckComplete(true);
    // Go directly to listening section (listening video serves as intro)
    setCurrentSection('listening');
  };

  // Keep section correction outside render to avoid setState during render.
  useEffect(() => {
    if (!effectiveMockTestId || !audioCheckComplete) return;

    const validSections = new Set(['audioCheck', 'listening', 'reading', 'writing', 'results']);
    if (validSections.has(currentSection)) return;

    const writingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_writing_completed`);
    const readingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_reading_completed`);
    const listeningCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_listening_completed`);

    const nextSection =
      writingCompleted === 'true'
        ? 'results'
        : readingCompleted === 'true'
          ? 'writing'
          : listeningCompleted === 'true'
            ? 'reading'
            : 'listening';

    setTimeout(() => {
      setCurrentSection(nextSection);
    }, 0);
  }, [audioCheckComplete, currentSection, effectiveMockTestId]);

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
        <MockTestStart onStart={handleAudioCheckComplete} mockTestId={effectiveMockTestId} />
      </div>
    );
  }

  // Render current section
  switch (currentSection) {
    case 'listening':
      return (
        <MockTestListening
          testId={mockTest.listening_id}
          mockTestId={mockTest.id}
          mockRunId={mockRunId}
          mockClientId={client?.id}
          onComplete={handleListeningComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
          videoSrc={listeningVideoSrc}
          onVideoStart={handleListeningVideoStart}
        />
      );

    case 'reading':
      return (
        <MockTestReading
          testId={mockTest.reading_id}
          mockTestId={mockTest.id}
          mockRunId={mockRunId}
          mockClientId={client?.id}
          onComplete={handleReadingComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
          videoSrc={readingVideoSrc}
        />
      );

    case 'writing':
      return (
        <MockTestWriting
          writingId={mockTest.writing_id}
          mockTestId={mockTest.id}
          mockRunId={mockRunId}
          mockClientId={client?.id}
          onComplete={handleWritingComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
          videoSrc={writingVideoSrc}
        />
      );

    case 'results':
      return (
        <MockTestResults
          results={sectionResults}
          mockTestId={effectiveMockTestId}
          mockRunId={mockRunId}
          onBack={() => navigate('/mock-tests')}
        />
      );

    default: {
      // If we're in a section that should show audio check, show it
      // Otherwise, show audio check as default/fallback only if not already completed
      if (!audioCheckComplete) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <MockTestStart onStart={handleAudioCheckComplete} mockTestId={effectiveMockTestId} />
          </div>
        );
      }
      // If audio check is complete but we're in an unknown section, check completion signals
      // to determine the correct next section
      const writingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_writing_completed`);
      const readingCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_reading_completed`);
      const listeningCompleted = localStorage.getItem(`mock_test_${effectiveMockTestId}_listening_completed`);
      
      if (writingCompleted === 'true') {
        return (
          <MockTestResults
            results={sectionResults}
            mockTestId={effectiveMockTestId}
            mockRunId={mockRunId}
            onBack={() => navigate('/mock-tests')}
          />
        );
      } else if (readingCompleted === 'true') {
        return (
          <MockTestWriting
            writingId={mockTest.writing_id}
            mockTestId={mockTest.id}
            mockRunId={mockRunId}
            mockClientId={client?.id}
            onComplete={handleWritingComplete}
            onEarlyExit={handleEarlyExit}
            onBack={() => navigate('/mock-tests')}
            videoSrc={writingVideoSrc}
          />
        );
      } else if (listeningCompleted === 'true') {
        return (
          <MockTestReading
            testId={mockTest.reading_id}
            mockTestId={mockTest.id}
            mockRunId={mockRunId}
            mockClientId={client?.id}
            onComplete={handleReadingComplete}
            onEarlyExit={handleEarlyExit}
            onBack={() => navigate('/mock-tests')}
            videoSrc={readingVideoSrc}
          />
        );
      }
      // No sections completed, default to listening (first section)
      return (
        <MockTestListening
          testId={mockTest.listening_id}
          mockTestId={mockTest.id}
          mockRunId={mockRunId}
          mockClientId={client?.id}
          onComplete={handleListeningComplete}
          onEarlyExit={handleEarlyExit}
          onBack={() => navigate('/mock-tests')}
          videoSrc={listeningVideoSrc}
          onVideoStart={handleListeningVideoStart}
        />
      );
    }
  }
};

export default MockTestFlow;

