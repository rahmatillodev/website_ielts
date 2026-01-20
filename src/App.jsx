import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
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
import {useSettingsStore} from "./store/systemStore";
import { useTestStore } from "./store/testStore";
import ListeningPage from "./pages/dashboard/listening/ListeningPage";
import ListeningPracticePage from "./pages/dashboard/listening/ListeningPracticePage";
import ListeningResultPage from "./pages/dashboard/listening/ListeningResultPage";
import PricingRoute from "./components/PricingRoute";
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
    <DndProvider backend={HTML5Backend}>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<LandingPage />} />
        </Route>
          <Route 
            path="/pricing" 
            element={
              <PricingRoute>
                <PricingPage />
              </PricingRoute>
            } 
          />

        {/* Protected routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/profile" element={<ProfilePage />} />
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
          <Route path="*" element={<DashboardPage />} />
          
        </Route>
      </Routes>
      <ToastContainer duration={2000} />
    </DndProvider>
  );
}

export default App;
