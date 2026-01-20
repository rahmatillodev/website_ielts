import LandingPage from "./pages/landing/LandingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ReadingPage from "./pages/dashboard/reading/ReadingPage";
import ReadingPracticePage from "./pages/dashboard/reading/ReadingPracticePage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import ReadingResultPage from "./pages/dashboard/reading/ReadingResultPage";
import { useAuthStore } from "./store/authStore";
import { ToastContainer } from "react-toastify";
import {useSettingsStore} from "./store/systemStore";
import { useTestStore } from "./store/testStore";
import LoginPage from "./pages/landing/LoginPage";
import SignUpPage from "./pages/landing/SignUpPage";
import PricingPage from "./pages/landing/PricingPage";
import DashboardLayout from "./layouts/DashboardLayout";
import PublicLayout from "./layouts/LandingLayout";
import ListeningPage from "./pages/dashboard/listening/ListeningPage";
import ListeningPracticePage from "./pages/dashboard/listening/ListeningPracticePage";
import NetworkModal from "./components/modal/NetworkModal";
import useNetworkStatus from "./hooks/use_network_status";
import Writing from "./pages/dashboard/Writing";
import Speaking from "./pages/dashboard/Speaking";
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
// Main App component with routing
function App() {
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const {fetchSettings} = useSettingsStore()
  const {fetchTests} = useTestStore();

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


  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<LandingPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reading" element={<ReadingPage />} />

          <Route path="/listening" element={<ListeningPage />} />

          <Route path="/speaking" element={<Speaking />} />
          <Route path="/writing" element={<Writing />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/reading-practice/:id"
            element={<ReadingPracticePage />}
          />
          <Route
            path="/listening-practice/:id"
            element={<ListeningPracticePage />}
          />
          <Route path="/reading-result/:id" element={<ReadingResultPage />} />
          <Route path="*" element={<DashboardPage />} />
          
        </Route>
      </Routes>
      <ToastContainer />
      <NetworkModal isOpen={!useNetworkStatus()} />
    </>
  );
}

export default App;
