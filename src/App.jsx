import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Layouts
import PublicLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Landing pages
import PricingPage from "./pages/landing/PricingPage";
import LoginPage from "./pages/landing/LoginPage";
import SignUpPage from "./pages/landing/SignUpPage";
import LandingPage from "./pages/landing/LandingPage";

// Dashboard pages
import DashboardPage from "./pages/dashboard/DashboardPage";
import ReadingPage from "./pages/dashboard/reading/ReadingPage";
import ReadingPracticePage from "./pages/dashboard/reading/ReadingPracticePage";
import ReadingResultPage from "./pages/dashboard/reading/ReadingResultPage";

import ListeningPage from "./pages/dashboard/listening/ListeningPage";
import ListeningPracticePage from "./pages/dashboard/listening/ListeningPracticePage";
import ListeningResultPage from "./pages/dashboard/listening/ListeningResultPage";

import WritingPage from "./pages/dashboard/writing/WritingPage";
import WritingPracticePage from "./pages/dashboard/writing/WritingPracticePage";
import WritingHistoryPage from "./pages/dashboard/writing/WritingHistoryPage";
import OwnWritingPage from "./pages/dashboard/writing/OwnWritingPage";

import SpeakingPage from "./pages/dashboard/speaking/SpeakingPage";
import SpeakingPracticePage from "./pages/dashboard/speaking/SpeakingPracticePage";
import SpeakingTaskPage from "./pages/dashboard/speaking/speakingtypes/textToSpeach/SpeakingTaskPage";
import SpeakingShadowingTask from "./pages/dashboard/speaking/speakingtypes/shadowingSpeach/SpeakingShadowingTask";
import SpeakingResultPage from "./pages/dashboard/speaking/SpeakingResultPage";

import ProfilePage from "./pages/dashboard/ProfilePage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import MockTestsPage from "./pages/dashboard/MockTestsPage";

// Stores
import { useAuthStore } from "./store/authStore";
import { useSettingsStore } from "./store/systemStore";
import { useTestStore } from "./store/testStore";

// UI
import { ToastContainer } from "react-toastify";
import FeedbackModal from "./components/modal/FeedbackModal";

import "./App.css";

function App() {
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const user = useAuthStore((state) => state.authUser);
  const loading = useAuthStore((state) => state.loading);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const { fetchSettings } = useSettingsStore();
  const { fetchTests } = useTestStore();

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const location = useLocation();

  // Init auth
  useEffect(() => {
    initializeSession();
  }, []);

  // Fetch settings + tests (SAFE)
  useEffect(() => {
    if (!isInitialized || !user) return;

    fetchSettings();

    const path = location.pathname;

    // ❌ PRACTICE PAGES — 
    if (
      path.startsWith("/reading-practice") ||
      path.startsWith("/listening-practice") ||
      path.startsWith("/writing-practice") ||
      path.startsWith("/speaking-practice") ||
      path.startsWith("/own-writing")
    ) {
      return;
    }

    // ✅ ONLY LIST / DASHBOARD PAGES
    fetchTests();
  }, [isInitialized, user, location.pathname, fetchSettings, fetchTests]);

  const isPracticePage =
    location.pathname.startsWith("/reading-practice") ||
    location.pathname.startsWith("/listening-practice") ||
    location.pathname.startsWith("/writing-practice") ||
    location.pathname.startsWith("/speaking-practice") ||
    location.pathname.startsWith("/speaking-result") ||
    location.pathname.startsWith("/own-writing");

  if (loading && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Routes>
        {/* PUBLIC */}
        {!user ? (
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pricing" element={<PricingPage />} />
          </Route>
        ) : (
          /* DASHBOARD */
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/reading" element={<ReadingPage />} />
            <Route path="/reading-practice/:id" element={<ReadingPracticePage />} />
            <Route path="/reading-result/:id" element={<ReadingResultPage />} />

            <Route path="/listening" element={<ListeningPage />} />
            <Route path="/listening-practice/:id" element={<ListeningPracticePage />} />
            <Route path="/listening-result/:id" element={<ListeningResultPage />} />

            <Route path="/writing" element={<WritingPage />} />
            <Route path="/writing-practice/:id" element={<WritingPracticePage />} />
            <Route path="/writing/writing-history" element={<WritingHistoryPage />} />
            <Route path="/own-writing" element={<OwnWritingPage />} />

            <Route path="/speaking" element={<SpeakingPage />} />
            <Route path="/speaking-practice/:id" element={<SpeakingPracticePage />} />
            <Route path="/speaking-practice" element={<SpeakingPracticePage />} />
            <Route path="/speaking-practice/:id/session" element={<SpeakingTaskPage />} />
            <Route path="/speaking-practice/:id/shadowing" element={<SpeakingShadowingTask />} />
            <Route path="/speaking-result/:id" element={<SpeakingResultPage />} />

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/mock-tests" element={<MockTestsPage />} />
          </Route>
        )}

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>

      <ToastContainer duration={2000} />
      <FeedbackModal isOpen={feedbackOpen} setFeedbackOpen={setFeedbackOpen} />

      {!isPracticePage && <div className="fixed_bottom_right_container" />}
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