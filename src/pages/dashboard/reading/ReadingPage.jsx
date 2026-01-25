import React, { useEffect } from "react";
import { useTestStore } from "@/store/testStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";
import TestsLibraryPage from "@/components/pages/TestsLibraryPage";

const ReadingPage = () => {
  // Get store state and actions
  const testReading = useTestStore((state) => state.test_reading);
  const loading = useTestStore((state) => state.loading);
  const loaded = useTestStore((state) => state.loaded);
  const fetchTests = useTestStore((state) => state.fetchTests);
  
  // Get dashboard data for card review status
  const authUser = useAuthStore((state) => state.authUser);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  
  // Fetch dashboard data on mount to ensure review status is available
  useEffect(() => {
    if (authUser?.id) {
      fetchDashboardData(authUser.id, false); // false = don't force refresh, use cache if valid
    }
  }, [authUser?.id, fetchDashboardData]);

  return (
    <TestsLibraryPage
      title="Master Your Reading Skills"
      description="Boost your band score with our extensive library of reading tests. Each test is designed to mirror the real exam format with instant AI scoring and detailed answer keys."
      testData={testReading}
      testType="reading"
      loading={loading}
      loaded={loaded}
      fetchTests={fetchTests}
      emptyStateMessage=""
      emptyFreeMessage=""
      emptyPremiumMessage=""
      emptySearchMessage=""
    />
  );
};

export default ReadingPage;