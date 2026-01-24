import { useEffect } from "react";
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
import WritingPage from "./pages/dashboard/WritingPage";
import SpeakingPage from "./pages/dashboard/SpeakingPage";
import PricingRoute from "./components/PricingRoute";
import ListeningResultPage from "./pages/dashboard/listening/ListeningResultPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import OwnWritingPage from "./pages/dashboard/writing/OwnWritingPage";
import MockTestsPage from "./pages/dashboard/MockTestsPage";
import "./App.css";
// Main App component with routing
function App() {
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const user = useAuthStore((state) => state.authUser);
  const { fetchSettings } = useSettingsStore()
  const { fetchTests } = useTestStore();

  const location = useLocation();

  useEffect(() => {
    // Initialize session on app load
    initializeSession();
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests])

  const isPracticePage = location.pathname.includes("/reading-practice") || location.pathname.includes("/listening-practice") || location.pathname.includes("/writing-practice") || location.pathname.includes("/speaking-practice");

  return (
    <DndProvider backend={HTML5Backend}>
      <Routes>

        {/* <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        /> */}
        <Route
          path="/pricing"
          element={
            // <PricingRoute>
              <PricingPage />
            // </PricingRoute>
          }
        />
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
            <Route path="/writing-practice" element={<OwnWritingPage />} />
            <Route
              path="/pricing"
              element={
                <PricingRoute>
                  <PricingPage />
                </PricingRoute>
              }
            />
            <Route
              path="/reading-practice/:id"
              element={<ReadingPracticePage />}
            />
            <Route
              path="/listening-practice/:id"
              element={<ListeningPracticePage />}
            />
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
      <NetworkModal isOpen={!useNetworkStatus()} />
      {!isPracticePage && <div className='fixed_bottom_right_container'>

      </div>}
    </DndProvider>
  );
}

export default App;




/// Profile Navbar Name and status completed
/// sidebar ni sectionlarga bo'lish va add full mock test completed
/// readingdagi question 2types 
/// payement  pageda center bilan ishlash 
/// beta tag and hello world completed
///  refine ui shimmer qo'shsih , cardlardagi chipslar , animation for card and navigation animations
/// only cards scroll bo'lsin va paginatin change lazy loading completed
/// writing page da own writing qo'shish with headers another pages completed
/// change color 