import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ComingSoonPage from "../ComingSoonPage";

const mockTypes = [
  {
    title: "Reading Mock",
    type: "reading",
    desc: "Practice only the Reading section with real exam format, timing, and scoring system.",
  },
  {
    title: "Listening Mock",
    type: "listening",
    desc: "Simulated Listening test with audio, timing control, and automatic result calculation.",
  },
  {
    title: "Writing Mock",
    type: "writing",
    desc: "Task 1 and Task 2 writing mock with submission system and teacher/AI evaluation support.",
  },
  {
    title: "Speaking Mock",
    type: "speaking",
    desc: "Simulated Speaking test with audio, timing control, and automatic result calculation.",
  }
];

const MockTestsPage = () => {

  return (
    <div>
      <ComingSoonPage title="Mock Tests Center" description="Prepare for your real exam with our professional mock test system. Choose a full mock exam or practice individual sections based on your needs." type="mock" headerAction={null} headerActionText="Practice Now" />
    </div>
  )
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-12 mx-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto text-center mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Mock Tests Center</h1>
        <p className="text-base md:text-lg text-gray-600">
          Prepare for your real exam with our professional mock test system. Choose a full mock exam or practice individual sections based on your needs.
        </p>
      </motion.div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-5xl mx-auto mb-12"
      >
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-4">What is a Mock Test?</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              A mock test is a simulated exam that follows the real test structure, timing, and difficulty level. It helps students understand the exam format, manage time properly, and identify weak areas before the real exam.
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Real exam structure and timing</li>
              <li>Section-based performance analysis</li>
              <li>Full exam simulation environment</li>
              <li>Professional evaluation system</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mock Types */}
      <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockTypes.map((mock, index) => (
          <motion.div
            key={mock.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Card className="h-full rounded-2xl shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col h-full">
                <h3 className="text-lg font-semibold mb-2">{mock.title}</h3>
                <p className="text-sm text-gray-600 grow">{mock.desc}</p>
                <Button
                  className="mt-4 w-full bg-blue-500 text-white hover:bg-blue-600"
                  onClick={() => navigate(`/mock/${mock.type}`)}
                >
                  About this test
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MockTestsPage;