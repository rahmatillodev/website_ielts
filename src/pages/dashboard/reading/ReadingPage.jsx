import React from "react";
import { useTestStore } from "@/store/testStore";
import TestsLibraryPage from "@/components/pages/TestsLibraryPage";

const ReadingPage = () => {
  // Get store state and actions
  const testReading = useTestStore((state) => state.test_reading);
  const loading = useTestStore((state) => state.loading);
  const loaded = useTestStore((state) => state.loaded);
  const fetchTests = useTestStore((state) => state.fetchTests);

  return (
    <TestsLibraryPage
      title="Master Your Reading Skills"
      description="Boost your band score with our extensive library of Academic and General Training reading tests. Each test is designed to mirror the real exam format with instant AI scoring and detailed answer keys."
      testData={testReading}
      testType="reading"
      loading={loading}
      loaded={loaded}
      fetchTests={fetchTests}
    />
  );
};

export default ReadingPage;