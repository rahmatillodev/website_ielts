import React, { useEffect } from "react";
import TestsLibraryPage from "@/components/TestsLibraryPage";
import { useWritingStore } from "@/store/writingStore";

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
      headerAction={"/own-writing"}
      headerActionText="Practice Now"
    />
   
  );
};

export default WritingPage;



// import React from 'react'
// import ComingSoonPage from "../ComingSoonPage";
// const WritingPage = () => {
//   return (
//      <div>
//       <ComingSoonPage type="writing" title="Writing Library" description="Boost your band score with our extensive library of writing tests." headerAction="/own-writing" headerActionText="Practice Now" />
//     </div>
//   )
// }

// export default WritingPage