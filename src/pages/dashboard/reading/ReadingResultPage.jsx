import { Button } from "@/components/ui/button";
import React from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { IoPrint, IoShareSocialSharp } from "react-icons/io5";
import { LuTimer } from "react-icons/lu";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import { HiOutlineHome, HiOutlineRefresh } from "react-icons/hi";
const ReadingResultPage = () => {
  const data = {
    title: "Academic Reading Practice Test 4",
    date: "Oct 24, 2023",
    score: "7.5",
    correct: 32,
    id: 4534,
    total: 40,
    time: "54m 20s",
    avgTime: "1m 21s",
  };
  const questions = [
    {
      id: "01",
      status: "incorrect",
      type: "TRUE / FALSE / NOT GIVEN",
      snippet:
        "The text suggests that the migration patterns of the Monarch butterfly are...",
      yourAnswer: "True",
      correctAnswer: "False",
    },
    {
      id: "02",
      status: "correct",
      type: "MULTIPLE CHOICE",
      snippet:
        "Which of the following best describes the main idea of paragraph 3?",
      yourAnswer: "Option B",
      correctAnswer: "Option B",
    },
    {
      id: "03",
      status: "correct",
      type: "MATCHING HEADINGS",
      snippet: "Matching Heading to Paragraph A",
      yourAnswer: "iv. Economic Impacts",
      correctAnswer: "iv. Economic Impacts",
    },
    {
      id: "01",
      status: "incorrect",
      type: "TRUE / FALSE / NOT GIVEN",
      snippet:
        "The text suggests that the migration patterns of the Monarch butterfly are...",
      yourAnswer: "True",
      correctAnswer: "False",
    },
    {
      id: "02",
      status: "correct",
      type: "MULTIPLE CHOICE",
      snippet:
        "Which of the following best describes the main idea of paragraph 3?",
      yourAnswer: "Option B",
      correctAnswer: "Option B",
    },
    {
      id: "03",
      status: "correct",
      type: "MATCHING HEADINGS",
      snippet: "Matching Heading to Paragraph A",
      yourAnswer: "iv. Economic Impacts",
      correctAnswer: "iv. Economic Impacts",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="flex max-w-max items-center gap-2 text-blue-500 font-bold text-sm mb-6 cursor-pointer uppercase tracking-wider"
        >
          <FaArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              Exam Results
            </h1>
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span>{data.title}</span>
              <span className="text-gray-400">•</span>
              <span>Completed on {data.date}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700 shadow-sm flex gap-2 h-11 px-6"
            >
              <IoPrint className="text-lg" /> Print
            </Button>
            {/* <Button
              variant="outline"
              className="border-gray-200 text-gray-700 shadow-sm flex gap-2 h-11 px-6"
            >
              <IoShareSocialSharp className="text-lg" /> Share
            </Button> */}
          </div>
        </div>

        <hr className="border-gray-200 mb-10" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Score Card */}
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-8 relative overflow-hidden shadow-sm">
            <div className="relative z-10">
              <h3 className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-4">
                Overall Band Score
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-black text-blue-500">
                  {data.score}
                </span>
                <span className="text-gray-400 font-bold text-xl">/ 9.0</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-gray-100 h-2.5 rounded-full mt-8 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full w-[83%]"></div>
              </div>
            </div>
            {/* Background Badge Icon */}
            <div className="absolute -right-4 top-4 text-blue-50/50">
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>

          {/* Correct Answers Card */}
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                Correct Answers
              </h3>
              <FaCheckCircle className="text-green-500 text-xl" />
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black text-gray-800">
                {data.correct}
              </span>
              <span className="text-gray-400 font-bold text-xl">
                / {data.total}
              </span>
            </div>
            <p className="text-gray-500 font-medium">Top 15% of test takers</p>
          </div>

          {/* Time Taken Card */}
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                Time Taken
              </h3>
              <LuTimer className="text-blue-500 text-xl" />
            </div>
            <div className="mb-6">
              <span className="text-5xl font-black text-gray-800">
                {data.time}
              </span>
            </div>
            <p className="text-gray-500 font-medium">
              Avg. {data.avgTime} per question
            </p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto">
          {/* Yuqoridagi qism (Statistika kartalari) kodingizda bor deb hisoblaymiz */}

          {/* Detailed Answer Review Section */}
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">
                Detailed Answer Review
              </h2>
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  className="bg-white shadow-sm border font-bold px-6 py-2 rounded-lg"
                >
                  All Questions
                </Button>
                <div className="flex gap-4 font-bold text-sm">
                  <span className="text-slate-500">
                    Correct{" "}
                    <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full ml-1">
                      {data.correct}
                    </span>
                  </span>
                  <span className="text-slate-500">
                    Incorrect{" "}
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-1">
                      {data.incorrect}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Table Header */}
            <div className="bg-white border rounded-xl overflow-y-scroll shadow-sm">
              <div className="grid grid-cols-[60px_80px_1fr_250px] bg-slate-50 border-b p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <div>#</div>
                <div>Status</div>
                <div>Question Type / Snippet</div>
                <div>Answer Comparison</div>
              </div>

              {/* Questions List */}
              <div className="divide-y">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="grid grid-cols-[60px_80px_1fr_250px] p-6 items-start hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="text-slate-400 font-bold">{q.id}</div>
                    <div>
                      {q.status === "correct" ? (
                        <FaCheckCircle className="text-green-500 text-xl" />
                      ) : (
                        <FaTimesCircle className="text-red-500 text-xl" />
                      )}
                    </div>
                    <div className="pr-8">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">
                        {q.type}
                      </div>
                      <p className="text-gray-800 font-bold leading-relaxed">
                        {q.snippet}
                      </p>
                    </div>
                    <div className="text-sm font-bold flex flex-col gap-3">
                      <div className="flex justify-between border-b border-dashed pb-1">
                        <span className="text-slate-400 font-medium">
                          Your Answer:
                        </span>
                        <span
                          className={
                            q.status === "correct"
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {q.yourAnswer}
                        </span>
                      </div>
                      {q.status === "incorrect" && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">
                            Correct:
                          </span>
                          <span className="text-green-500">
                            {q.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  className="text-slate-500 w-md hover:text-black bg-blue-100 hover:bg-blue-200 font-bold transition-all flex items-center gap-2 px-6 h-12 rounded-xl"
                >
                  <HiOutlineHome className="text-xl" />
                  Go To Home
                </Button>
              </Link>

              <Link to={"/reading-practice/" + data.id}>
                <Button className="bg-blue-600 w-md hover:bg-blue-700 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 active:scale-95">
                  <HiOutlineRefresh className="text-xl" />
                  Retake Exam
                </Button>
              </Link>
            </div>
          </div>
          <footer class="mt-12 py-8 text-center text-slate-400 text-sm">
            <p>© 2023 IELTS Pro. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ReadingResultPage;
