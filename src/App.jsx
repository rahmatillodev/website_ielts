import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PublicLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import MockTestLayout from "./layouts/MockTestLayout";
// import Settings from './pages/Settings'
import PricingPage from "./pages/landing/PricingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LoginPage from "./pages/landing/LoginPage";
import SignUpPage from "./pages/landing/SignUpPage";
import LandingPage from "./pages/landing/LandingPage";
import ReadingPage from "./pages/dashboard/reading/ReadingPage";
import ReadingPracticePage from "./pages/dashboard/reading/ReadingPracticePage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import ReadingResultPage from "./pages/dashboard/reading/ReadingResultPage";
import { useAuthStore } from "./store/authStore";
import { ToastContainer } from "react-toastify";
import { useSettingsStore } from "./store/systemStore";
import { useTestStore } from "./store/testStore";
import ListeningPage from "./pages/dashboard/listening/ListeningPage";
import ListeningPracticePage from "./pages/dashboard/listening/ListeningPracticePage";

import WritingPage from "./pages/dashboard/writing/WritingPage";
import SpeakingPage from "./pages/dashboard/SpeakingPage";
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
  }, [fetchTests, isInitialized, user])

  // Set access mode in sessionStorage based on current route
  // This works for both logged in and logged out users
  useEffect(() => {
    
    // Don't set access mode for public pages (login, signup, landing)
    if (location.pathname === '/' || 
        location.pathname === '/login' || 
        location.pathname === '/signup') {
      return;
    }

    const currentMode = sessionStorage.getItem('accessMode');
    
    // Set access mode based on route type
    if (isMockTestRoute(location.pathname)) {
      // Always set mockTest for mock test routes - this is the priority
      sessionStorage.setItem('accessMode', 'mockTest');
    } else if (location.pathname !== '/' && 
               location.pathname !== '/login' && 
               location.pathname !== '/signup') {
      // Only set regular mode if:
      // 1. Current mode is NOT mockTest (NEVER overwrite mockTest mode)
      // 2. User is actually on a regular dashboard route (not practice pages that can be from either mode)
      const isPracticePage = location.pathname.includes('/reading-practice') || 
                            location.pathname.includes('/listening-practice') || 
                            location.pathname.includes('/writing-practice') ||
                            location.pathname.includes('/reading-result') ||
                            location.pathname.includes('/listening-result');
      
      
      // CRITICAL: Never overwrite mockTest mode, even if on regular routes
      // This ensures users in mock test mode stay in mock test mode
      if (!currentMode && !isPracticePage) {
        sessionStorage.setItem('accessMode', 'regular');
      } 
      // If currentMode is 'mockTest', do nothing - preserve it
    }
  }, [location.pathname, user]);

  const isPracticePage = 
  location.pathname.includes("/reading-practice") || 
  location.pathname.includes("/listening-practice") || 
  location.pathname.includes("/writing-practice") || 
  location.pathname.includes("/speaking-practice") || 
  location.pathname.includes("/own-writing") ||
  location.pathname.includes("/mock-test/flow")

  // Helper function to check if a route is a mock test route
  const isMockTestRoute = (path) => {
    return path.startsWith("/mock-test") || 
           path.startsWith("/mock-tests") || 
           path.startsWith("/mock/") || 
           path === "/mock";
  }

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
       
        {!user ?
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>
            
          :
          <>
            {/* Mock Test Routes - Separate Layout */}
            <Route element={<MockTestLayout />}>
              <Route path="/mock-tests" element={<MockTestsPage />} />
              <Route path="/mock" element={<MockTestsPage />} />
              <Route path="/mock/select" element={<MockTypeSelectionPage />} />
              <Route path="/mock/online" element={<MockOnlinePage />} />
              <Route path="/mock/center" element={<MockCenterPage />} />
              <Route path="/mock-test/flow/:mockTestId" element={<MockTestFlow />} />
              <Route path="/mock-test/results" element={<MockTestResults />} />
              {/* Practice pages accessible from mock test routes */}
              <Route path="/reading-practice/:id" element={<ReadingPracticePage />} />
              <Route path="/listening-practice/:id" element={<ListeningPracticePage />} />
              <Route path="/writing-practice/:id" element={<WritingPracticePage />} />
              <Route path="/reading-result/:id" element={<ReadingResultPage />} />
              <Route path="/listening-result/:id" element={<ListeningResultPage />} />
              {/* Profile is accessible from both layouts */}
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Regular Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reading" element={<ReadingPage />} />
              <Route path="/listening" element={<ListeningPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/writing" element={<WritingPage />} />
              <Route path="/speaking" element={<SpeakingPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/own-writing" element={<OwnWritingPage />} />
              <Route path="/writing/writing-history" element={<WritingHistoryPage />} />
              <Route path="/reading-practice/:id" element={<ReadingPracticePage />} />
              <Route path="/listening-practice/:id" element={<ListeningPracticePage />} />
              <Route path="/writing-practice/:id" element={<WritingPracticePage />} />
              <Route path="/reading-result/:id" element={<ReadingResultPage />} />
              <Route path="/listening-result/:id" element={<ListeningResultPage />} />
            </Route>
          </>
        }
        <Route
          path="*"
          element={user ? (
            isMockTestRoute(location.pathname) ? (
              <Navigate to="/mock-tests" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
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