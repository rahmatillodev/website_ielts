import React, { useEffect } from "react";
import { useTestStore } from "@/store/testStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";
import TestsLibraryPage from "@/components/TestsLibraryPage";

const ListeningPage = () => {
  // Get store state and actions
  const testListening = useTestStore((state) => state.test_listening);
  const loading = useTestStore((state) => state.loading);
  const loaded = useTestStore((state) => state.loaded);
  const fetchTests = useTestStore((state) => state.fetchTests);
  
  // Get dashboard data for card review status
  const authUser = useAuthStore((state) => state.authUser);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  const dashboardLoading = useDashboardStore((state) => state.loading);
  
  // Fetch dashboard data on mount to ensure review status is available
  useEffect(() => {
    if (authUser?.id) {
      fetchDashboardData(authUser.id, false); // false = don't force refresh, use cache if valid
    }
  }, [authUser?.id, fetchDashboardData]);

  return (
    <TestsLibraryPage
      title="Listening Library"
      description="Boost your band score with our extensive library of listening tests. Each test is designed to mirror the real exam format with instant AI scoring and detailed answer keys."
      testData={testListening}
      testType="listening"
      loading={loading}
      loaded={loaded}
      fetchTests={fetchTests}
      dashboardLoading={dashboardLoading}
      emptyStateMessage=""
      emptyFreeMessage=""
      emptyPremiumMessage=""
      emptySearchMessage=""
    />
  );
};

export default ListeningPage;
