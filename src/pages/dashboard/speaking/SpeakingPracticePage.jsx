import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

/**
 
 */
const mockSpeakingQuestions = [
  {
    id: uuidv4(),
    question: "What is your favorite hobby?",
  },
  {
    id: uuidv4(),
    question: "Do you like traveling? Why or why not?",
  },
  {
    id: uuidv4(),
    question: "Describe your hometown.",
  },
];

const SpeakingPracticePage = () => {
  const { id } = useParams(); // speaking test id
  const navigate = useNavigate();

  const [activeQuestion, setActiveQuestion] = useState(
    mockSpeakingQuestions[0]
  );
  const [answer, setAnswer] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 🔊 TEXT → SPEECH (Browser API, error chiqarmaydi)
  const readAnswerAloud = () => {
    if (!answer.trim()) return;

    // Agar oldingi ovoz bo‘lsa to‘xtat
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] p-4 gap-4 bg-gray-50">
      {/* LEFT — QUESTIONS */}
      <div className="w-1/3 bg-white border rounded-xl p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Speaking Questions</h2>

        <div className="flex flex-col gap-2">
          {mockSpeakingQuestions.map((q) => {
            const isActive = q.id === activeQuestion.id;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setActiveQuestion(q);
                  setAnswer("");
                }}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isActive
                    ? "bg-blue-50 border-blue-500 font-semibold"
                    : "hover:bg-gray-100"
                }`}
              >
                {q.question}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT — ANSWER */}
      <div className="flex-1 bg-white border rounded-xl p-4 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Your Answer</h2>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back
          </button>
        </div>

        <p className="text-gray-700 mb-3">
          <span className="font-semibold">Question:</span>{" "}
          {activeQuestion.question}
        </p>

        <textarea
          className="flex-1 resize-none border rounded-lg p-4 outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Type your answer here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-500">
            Words: {answer.trim() ? answer.trim().split(/\s+/).length : 0}
          </span>

          <button
            onClick={readAnswerAloud}
            disabled={!answer.trim()}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition-all ${
              isSpeaking
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSpeaking ? "Reading..." : "▶ Read My Answer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpeakingPracticePage;
