import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PublicLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";
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
import NetworkModal from "./components/modal/NetworkModal";
import useNetworkStatus from "./hooks/use_network_status";
import WritingPage from "./pages/dashboard/writing/WritingPage";
import SpeakingPage from "./pages/dashboard/SpeakingPage";
import ListeningResultPage from "./pages/dashboard/listening/ListeningResultPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import OwnWritingPage from "./pages/dashboard/writing/OwnWritingPage";
import MockTestsPage from "./pages/dashboard/MockTestsPage";
import "./App.css";
import FeedbackModal from "./components/modal/FeedbackModal";
import WritingPracticePage from "./pages/dashboard/writing/WritingPracticePage";
import WritingHistoryPage from "./pages/dashboard/writing/WritingHistoryPage";
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

  const isPracticePage = location.pathname.includes("/reading-practice") || location.pathname.includes("/listening-practice") || location.pathname.includes("/writing-practice") || location.pathname.includes("/speaking-practice") || location.pathname.includes("/own-writing");

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

        {/* <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        /> */}
       
        {!user ?
          <Route element={<PublicLayout />}>

            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>
            
          :
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reading" element={<ReadingPage />} />
            <Route path="/listening" element={<ListeningPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/writing" element={<WritingPage />} />
            <Route path="/speaking" element={<SpeakingPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/mock-tests" element={<MockTestsPage />} />
            <Route path="/own-writing" element={<OwnWritingPage />} />
            <Route path="/writing/writing-history" element={<WritingHistoryPage />} />
            <Route path="/reading-practice/:id" element={<ReadingPracticePage />} />
            <Route path="/listening-practice/:id" element={<ListeningPracticePage />} />
            <Route path="/writing-practice/:id" element={<WritingPracticePage />} />
            <Route path="/reading-result/:id" element={<ReadingResultPage />} />
            <Route path="/listening-result/:id" element={<ListeningResultPage />} />

          </Route>
        }
        <Route
          path="*"
          element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />}
        />

      </Routes>
      <ToastContainer duration={2000} />
      {/* <NetworkModal isOpen={!useNetworkStatus()} /> */}
      <FeedbackModal isOpen={feedbackOpen} setFeedbackOpen={setFeedbackOpen} />
      {!isPracticePage && <div className='fixed_bottom_right_container'>

      </div>}
    </DndProvider>
  );
}

export default App;




/// pdf ni to'grilash high
/// sidebarni ranglari  done
/// resultni ishlatish kerak orqaga qaytganda high
/// pendingni to'g'rilash kerak orqaga qaytganda high
/// tab almashganlarda  done
/// image upload qilish kerak bo'ladi userda  done
/// admimnda contextlarni to'grilsh kerak high
/// highlight delete qilish kerak  done
/// listening resultni to'g'rilash kerak 
/// bookmarkni kattalshtirish kerak va 
/// reaview qilish patdi va redo qilish tekshirish 
/// send telegram button qilish kerak 
/// channel qo'shish kerak 