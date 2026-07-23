import React, { useEffect } from "react";
import LibraryPage from "@/components/library/LibraryPage";
import { useTestStore } from "@/store/testStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";

const SpeakingLibraryPage = () => {
  const testSpeaking = useTestStore((state) => state.test_speaking);
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

  return (
    <LibraryPage
      testData={testSpeaking}
      testType="speaking"
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

export default SpeakingLibraryPage;