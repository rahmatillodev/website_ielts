import React from "react";
import { useTestStore } from "@/store/testStore";
import TestsLibraryPage from "@/components/pages/TestsLibraryPage";

const ListeningPage = () => {
  // Get store state and actions
  const testListening = useTestStore((state) => state.test_listening);
  const loading = useTestStore((state) => state.loading);
  const loaded = useTestStore((state) => state.loaded);
  const fetchTests = useTestStore((state) => state.fetchTests);

  return (
    <TestsLibraryPage
      title="Listening Library"
      description="Simulate the actual listening test environment. Each test contains 4 parts and 40 questions."
      testData={testListening}
      testType="listening"
      loading={loading}
      loaded={loaded}
      fetchTests={fetchTests}
    />
  );
};

export default ListeningPage;
