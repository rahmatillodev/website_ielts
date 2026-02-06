import React, { useEffect } from "react";
import TestsLibraryPage from "@/components/TestsLibraryPage";
import { useSpeakingStore } from "@/store/LocalStorage/speakingStore";

const SpeakingPage = () => {
  const { speakings, loading, fetchSpeakings } = useSpeakingStore();

  useEffect(() => {
    fetchSpeakings();
  }, [fetchSpeakings]);

  return (
    <TestsLibraryPage
      title="Speaking Library"
      description="Boost your band score with our extensive library of speaking tests."
      testData={speakings}
      testType="speaking"
      loading={loading}
      fetchTests={fetchSpeakings}
    />
  );
};

export default SpeakingPage;
