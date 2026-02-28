import { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PublicLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import MockTestLayout from "./layouts/MockTestLayout";
import PricingPage from "./pages/landing/PricingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LoginPage from "./pages/landing/LoginPage";
import SignUpPage from "./pages/landing/SignUpPage";
import ForgotPasswordPage from "./pages/landing/ForgotPasswordPage";
import ResetPasswordPage from "./pages/landing/ResetPasswordPage";
import LandingPage from "./pages/landing/LandingPage";
import ReadingPage from "./pages/dashboard/reading/ReadingPage";
import ReadingPracticePage from "./pages/dashboard/reading/ReadingPracticePage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import ReadingResultPage from "./pages/dashboard/reading/ReadingResultPage";
import { useAuthStore } from "./store/authStore";
import { useMockTestClientStore } from "./store/mockTestClientStore";
import { ToastContainer } from "react-toastify";
import { useSettingsStore } from "./store/systemStore";
import { useTestStore } from "./store/testStore";
import ListeningPage from "./pages/dashboard/listening/ListeningPage";
import ListeningPracticePage from "./pages/dashboard/listening/ListeningPracticePage";

import WritingPage from "./pages/dashboard/writing/WritingPage";
import SpeakingPage from "./pages/dashboard/SpeakingPage";
import SpeakingPracticePage from "./pages/dashboard/speaking/SpeakingPracticePage";
import SpeakingTaskPage from "./pages/dashboard/speaking/speakingtypes/textToSpeach/SpeakingTaskPage";
import SpeakingResultPage from "./pages/dashboard/speaking/SpeakingResultPage";
import ListeningResultPage from "./pages/dashboard/listening/ListeningResultPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import OwnWritingPage from "./pages/dashboard/writing/OwnWritingPage";
import MockTestsPage from "./pages/dashboard/mock/MockTestsPage";
import MockTypeSelectionPage from "./pages/dashboard/mock/MockTypeSelectionPage";
import MockOnlinePage from "./pages/dashboard/mock/MockOnlinePage";
import MockCenterPage from "./pages/dashboard/mock/MockCenterPage";
import MockTestFlow from "./pages/dashboard/mock/MockTestFlow";
import "./App.css";
import FeedbackModal from "./components/modal/FeedbackModal";
import WritingPracticePage from "./pages/dashboard/writing/WritingPracticePage";
import WritingHistoryPage from "./pages/dashboard/writing/WritingHistoryPage";
import MockTestResults from "./pages/dashboard/mock/MockTestResults";
import MockTestHistoryPage from "./pages/dashboard/mock/MockTestHistoryPage";
import MockTestClientResultsPage from "./pages/dashboard/mock/MockTestClientResultsPage";
import MockTestRoute from "./components/MockTestRoute";
import RegularDashboardRoute from "./components/RegularDashboardRoute";
// Main App component with routing
function App() {
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const validateSessionAgainstDatabase = useAuthStore(
    (state) => state.validateSessionAgainstDatabase
  );
  const user = useAuthStore((state) => state.authUser);
  const loading = useAuthStore((state) => state.loading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const { fetchSettings } = useSettingsStore()
  const { fetchTests } = useTestStore();
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    // Initialize session on app load
    initializeSession();
  }, []);

  useEffect(() => {
      fetchSettings();
    
  }, [fetchSettings]);

  useEffect(() => {
    if (isInitialized && user) {
      fetchTests();
    }
  }, [fetchTests, isInitialized, user]);

  const checkUserIsMockTestClient = useMockTestClientStore((state) => state.checkUserIsMockTestClient);
  useEffect(() => {
    if (isInitialized && user?.id) {
      checkUserIsMockTestClient(user.id);
    }
  }, [isInitialized, user?.id, checkUserIsMockTestClient]);

  // Helper function to check if a route is a mock test route
  const isMockTestRoute = (path) => {
    return path.startsWith("/mock-test") || 
           path.startsWith("/mock-tests") || 
           path.startsWith("/mock/") || 
           path === "/mock";
  }

  // History and client results: do not change session accessMode; user returns to context they came from
  const isHistoryOrResultsPath = (path) => {
    return path === '/mock-test/history' ||
           path === '/mock-test/history-regular' ||
           path.startsWith('/mock-test/results/') ||
           path.startsWith('/mock-test/results-regular/');
  }

  // Helper function to check if a route is a practice page
  const isPracticePageRoute = (path) => {
    return path.includes('/reading-practice') || 
           path.includes('/listening-practice') || 
           path.includes('/writing-practice') ||
           path.includes('/speaking-practice') ||
           path.includes('/reading-result') ||
           path.includes('/listening-result') ||
           path.includes('/speaking-result');
  }

  // Set access mode in sessionStorage based on current route
  // This works for both logged in and logged out users
  useEffect(() => {
    // Don't set access mode for login/signup pages (preserve existing mode)
    if (location.pathname === '/login' || location.pathname === '/signup') {
      return;
    }

    // Landing page (/) - always set to regular
    if (location.pathname === '/' ||  location.pathname === '/dashboard') {
      if (!user) {
        sessionStorage.setItem('accessMode', 'regular');
      }
      return;
    }

    // Profile page is accessible from both platforms - preserve current accessMode
    // if (location.pathname === '/profile') {
    //   return;
    // }

    // If user is not authenticated, set accessMode based on route type
    // This ensures users have the correct accessMode set before login
    if (!user) {
      if (isMockTestRoute(location.pathname)) {
        sessionStorage.setItem('accessMode', 'mockTest');
      } else if (isPracticePageRoute(location.pathname)) {
        // Practice pages - check URL params or preserve existing
        const currentAccessMode = sessionStorage.getItem('accessMode');
        if (!currentAccessMode) {
          const isMockTestParam = searchParams.get('mockTest') === 'true';
          sessionStorage.setItem('accessMode', isMockTestParam ? 'mockTest' : 'regular');
        }
      } else if (location.pathname === '/dashboard' || 
                 location.pathname === '/reading' ||
                 location.pathname === '/listening' ||
                 location.pathname === '/writing' ||
                 location.pathname === '/speaking' ||
                 location.pathname === '/analytics' ||
                 location.pathname === '/own-writing') {
        // Regular dashboard routes - set to regular
        sessionStorage.setItem('accessMode', 'regular');
      }
      return;
    }

    // For authenticated users, set access mode based on route type
    // Practice pages accessed from mock test routes should preserve mockTest mode
    if (isPracticePageRoute(location.pathname)) {
      // If accessMode is not set, try to infer from URL params or set based on context
      const currentAccessMode = sessionStorage.getItem('accessMode');
      if (!currentAccessMode) {
        // Check if there's a mockTest param in the URL
        const isMockTestParam = searchParams.get('mockTest') === 'true';
        if (isMockTestParam) {
          sessionStorage.setItem('accessMode', 'mockTest');
        } else {
          // Default to regular if no indication of mock test
          sessionStorage.setItem('accessMode', 'regular');
        }
      }
      // Otherwise preserve existing accessMode
      return;
    }

    // Do not change accessMode on history/results – preserve so user returns to same context
    if (isHistoryOrResultsPath(location.pathname)) {
      return;
    }

    // Set access mode based on route type
    if (isMockTestRoute(location.pathname)) {
      // Always set mockTest for mock test routes
      sessionStorage.setItem('accessMode', 'mockTest');
    } else {
      // Set regular mode for regular dashboard routes
      sessionStorage.setItem('accessMode', 'regular');
    }
  }, [location.pathname, location.search, user]);

  // Helper function to check if a route is a practice page (for UI display)
  const isPracticePage = 
    location.pathname.includes("/reading-practice") || 
    location.pathname.includes("/listening-practice") || 
    location.pathname.includes("/writing-practice") || 
    location.pathname.includes("/speaking-practice") || 
    location.pathname.includes("/own-writing") ||
    location.pathname.includes("/mock-test/flow") || 
    location.pathname.includes("/speaking-result");

  // Centralized redirect logic based on accessMode
  // Use useEffect to handle redirects to prevent infinite loops
  const navigate = useNavigate();
  const lastRedirectRef = useRef(null);
  const isMockTestClient = useMockTestClientStore((state) => state.isMockTestClient);

  useEffect(() => {
    if (!user || loading || !isInitialized) {
      return;
    }
    
    let accessMode = sessionStorage.getItem('accessMode');
    const pathname = location.pathname;
    
    // If accessMode is not set, try to infer from route
    if (!accessMode) {
      if (isMockTestRoute(pathname)) {
        accessMode = 'mockTest';
        sessionStorage.setItem('accessMode', 'mockTest');
      } else if (isPracticePageRoute(pathname)) {
        // Check URL params for mockTest indicator
        const isMockTestParam = searchParams.get('mockTest') === 'true';
        accessMode = isMockTestParam ? 'mockTest' : 'regular';
        sessionStorage.setItem('accessMode', accessMode);
      } else {
        // Default to regular for other routes
        accessMode = 'regular';
        sessionStorage.setItem('accessMode', 'regular');
      }
    }
    
    // Allow practice pages and profile from both platforms
    // if (pathname === '/profile' || isPracticePageRoute(pathname)) {
    //   lastRedirectRef.current = null;
    //   return;
    // }
    
    // Allow public pages
    if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
      lastRedirectRef.current = null;
      return;
    }
    
    let target = null;
    
    // Mock test history and client results: accessible from both contexts; do not redirect (session store unchanged)
    const isHistoryOrResultsRoute =
      pathname === '/mock-test/history' ||
      pathname === '/mock-test/history-regular' ||
      pathname.startsWith('/mock-test/results/') ||
      pathname.startsWith('/mock-test/results-regular/');
    
    // If accessMode is mockTest, redirect away from regular dashboard routes
    if (accessMode === 'mockTest') {
      const isRegularDashboardRoute = pathname === '/dashboard' || 
                                      pathname === '/reading' || 
                                      pathname === '/listening' || 
                                      pathname === '/writing' || 
                                      pathname === '/speaking' || 
                                      pathname === '/analytics' ||
                                      pathname === '/own-writing' ||
                                      pathname.startsWith('/writing/writing-history');
      
      if (isRegularDashboardRoute) {
        target = '/mock-tests';
      }
    }
    
    // If accessMode is regular, redirect away from mock test routes (except history/results when user is a mock test client)
    if (accessMode === 'regular') {
      if (isMockTestRoute(pathname)) {
        if (isHistoryOrResultsRoute && isMockTestClient === true) {
          // Allow: user is in mock_test_clients
        } else {
          target = '/dashboard';
        }
      }
    }
    
    // Only redirect if we have a target, it's different from current path, and we haven't already redirected to this target
    if (target && target !== pathname && lastRedirectRef.current !== `${pathname}->${target}`) {
      lastRedirectRef.current = `${pathname}->${target}`;
      navigate(target, { replace: true });
    } else if (!target) {
      // Reset the ref if no redirect is needed
      lastRedirectRef.current = null;
    }
  }, [location.pathname, location.search, user, loading, isInitialized, navigate, isMockTestClient]);

  // Show loading state while initializing authentication
  if (loading && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Routes>
        {/* Forgot/reset password: available even when user has a session (e.g. recovery link) */}
        <Route element={<PublicLayout />}>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        {!user ? (
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>
        ) : (
          <>
            {/* Mock Test Routes - Separate Layout with Route Guard */}
            <Route element={<MockTestRoute><MockTestLayout /></MockTestRoute>}>
              <Route path="/mock-tests" element={<MockTestsPage />} />
              <Route path="/mock" element={<MockTestsPage />} />
              <Route path="/mock/select" element={<MockTypeSelectionPage />} />
              <Route path="/mock/online" element={<MockOnlinePage />} />
              <Route path="/mock/center" element={<MockCenterPage />} />
              <Route path="/mock-test/flow/:mockTestId" element={<MockTestFlow />} />
              <Route path="/mock-test/results" element={<MockTestResults />} />

              <Route path="/reading-practice/:id" element={<ReadingPracticePage />} />
              <Route path="/listening-practice/:id" element={<ListeningPracticePage />} />
              <Route path="/writing-practice/:id" element={<WritingPracticePage />} />
              <Route path="/reading-result/:id" element={<ReadingResultPage />} />
              <Route path="/listening-result/:id" element={<ListeningResultPage />} />
              <Route path="/mock-test/history" element={<MockTestHistoryPage from="mockTest" />} />
              <Route path="/mock-test/results/:clientId" element={<MockTestClientResultsPage />} />
              {/* Profile accessible from mock test layout */}
            </Route>

            {/* Regular Dashboard Routes with Route Guard */}
            <Route element={<RegularDashboardRoute><DashboardLayout /></RegularDashboardRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reading" element={<ReadingPage />} />
              <Route path="/listening" element={<ListeningPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/writing" element={<WritingPage />} />
              <Route path="/speaking" element={<SpeakingPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/own-writing" element={<OwnWritingPage />} />
              <Route path="/writing/writing-history" element={<WritingHistoryPage />} />
              {/* Practice pages accessible from regular dashboard */}
              <Route path="/reading-practice/:id" element={<ReadingPracticePage />} />
              <Route path="/listening-practice/:id" element={<ListeningPracticePage />} />
              <Route path="/speaking-practice/:id/session" element={<SpeakingTaskPage />} />
              <Route path="/speaking-practice/:id" element={<SpeakingPracticePage />} />
              <Route path="/writing-practice/:id" element={<WritingPracticePage />} />
              <Route path="/reading-result/:id" element={<ReadingResultPage />} />
              <Route path="/listening-result/:id" element={<ListeningResultPage />} />
              <Route path="/speaking-result/:id" element={<SpeakingResultPage />} />
              <Route path="/mock-test/history-regular" element={<MockTestHistoryPage from="regular" />} />
              <Route path="/mock-test/results-regular/:clientId" element={<MockTestClientResultsPage />} />
            </Route>
          </>
        )}
        <Route
          path="*"
          element={user ? (() => {
            // Check access mode to determine where to redirect
            const accessMode = sessionStorage.getItem('accessMode');
            if (accessMode === 'mockTest') {
              return <Navigate to="/mock-tests" replace />;
            }
            return <Navigate to="/dashboard" replace />;
          })() : (
            <Navigate to="/login" replace />
          )}
        />

      </Routes>
      <ToastContainer duration={2000} />
      <FeedbackModal isOpen={feedbackOpen} setFeedbackOpen={setFeedbackOpen} />
      {!isPracticePage && <div className='fixed_bottom_right_container'>

      </div>}
    </DndProvider>
  );
}

export default App;