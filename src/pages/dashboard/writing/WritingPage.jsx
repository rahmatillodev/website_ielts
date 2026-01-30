import React, { useEffect } from "react";
import TestsLibraryPage from "@/components/TestsLibraryPage";
import { useWritingStore } from "@/store/WritingStore";

const WritingPage = () => {

  const { writings, loading, fetchWritings } = useWritingStore();

  useEffect(() => {
    fetchWritings();
  }, [fetchWritings]);

  return (
    <TestsLibraryPage
      title="Writing Library"
      description="Boost your band score with our extensive library of writing tests."
      testData={writings}
      testType="writing"
      loading={loading}
      fetchTests={fetchWritings}
      headerAction={null}
    />
  );
};

export default WritingPage;