import React, { useEffect } from "react";
import TestsLibraryPage from "@/components/TestsLibraryPage";
import { useTestStore } from "@/store/testStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";

// 1. VAQTINCHA LOCAL MA'LUMOTLAR (MOCK DATA)
const MOCK_SHADOWING_DATA = [
  {
    id: "sh-1",
    title: "IELTS Speaking: Describe a Famous Person",
    level: "Medium",
    duration: "12 min",
    questions_count: 1,
    is_free: true,
    created_at: "Feb 11 16:32",
    video_id: "yVPYHNslNyc" // Keyinchalik video ochish uchun
  },
  {
    id: "sh-2",
    title: "Daily Conversation: Environment & Pollution",
    level: "Easy",
    duration: "10 min",
    questions_count: 1,
    is_free: true,
    created_at: "Feb 12 10:00",
    video_id: "7X_W79_O_eI"
  },
  {
    id: "sh-3",
    title: "Advanced Shadowing: Artificial Intelligence",
    level: "Hard",
    duration: "18 min",
    questions_count: 1,
    is_free: false, // Bu Premium kartochka bo'lib ko'rinadi
    created_at: "Feb 13 14:45",
    video_id: "L_p_vPZ9v68"
  }
];

const ShadowingLibraryPage = () => {
  const testShadowing = useTestStore((state) => state.test_shadowing);
  const loading = useTestStore((state) => state.loading);
  const loaded = useTestStore((state) => state.loaded);
  const fetchTests = useTestStore((state) => state.fetchTests);

  const authUser = useAuthStore((state) => state.authUser);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  const dashboardLoading = useDashboardStore((state) => state.loading);

  useEffect(() => {
    if (authUser?.id) {
      fetchDashboardData(authUser.id, false);
    }
  }, [authUser?.id, fetchDashboardData]);

  // 2. AGAR BAZADAN MA'LUMOT KELMASA, MOCK DATA'NI KO'RSATISH
  const finalData = testShadowing?.length > 0 ? testShadowing : MOCK_SHADOWING_DATA;

  return (
    <TestsLibraryPage
      title="Shadowing Library"
      description="Boost your band score with our extensive library of shadowing tests."
      testData={finalData} // Mock ma'lumotlar shu yerga uzatiladi
      testType="shadowing"
      loading={loading}
      loaded={true} // Mock darrov chiqishi uchun true qildik
      fetchTests={fetchTests}
      dashboardLoading={dashboardLoading}
      emptyStateMessage="No shadowing materials found."
      emptyFreeMessage=""
      emptyPremiumMessage=""
      emptySearchMessage=""
    />
  );
};

export default ShadowingLibraryPage;