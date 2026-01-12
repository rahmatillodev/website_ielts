import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
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
import AdminPage from "./pages/dashboard/AdminPage";
import AdminRoute from "./components/AdminRoute";
import { useAuthStore } from "./store/authStore";
import { ToastContainer } from "react-toastify";
// Main App component with routing
function App() {
  const initializeSession = useAuthStore((state) => state.initializeSession);

  useEffect(() => {
    // Initialize session on app load
    initializeSession();
  }, [initializeSession]);

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          {/* <Route path="/about" element={<About />} /> */}
        </Route>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/reading-practice/:id"
            element={<ReadingPracticePage />}
          />
          <Route path="/reading-result/:id" element={<ReadingResultPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
