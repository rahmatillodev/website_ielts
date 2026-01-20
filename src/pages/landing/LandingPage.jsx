import React from "react";
import { Button } from "@/components/ui/button";
import {
  LuMic,
  LuFileText,
  LuMonitor,
  LuArrowRight,
  LuHeadphones,
  LuBookOpen,
  LuPenTool,
  LuTrendingUp,
} from "react-icons/lu";
import { TfiWrite } from "react-icons/tfi";

const LandingPage = () => {
  return (
    <div className="min-h-screen">

      {/* ================= HERO ================= */}
      <section className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F0F7FF] to-[#EEF5FF] flex items-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">

          {/* LEFT */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-full">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              <span className="text-xs font-black text-blue-600 uppercase">
                NEW: AI SPEAKING MOCK TESTS
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-tight">
              Build Skills,<br />
              Boost Scores,<br />
              Master <span className="text-[#4A90E2]">IELTS</span>.
            </h1>

            <p className="text-xl text-gray-600 max-w-xl">
              Personalized practice, ruthless feedback, and full-length mock
              tests designed to push you to Band 8.0+.
            </p>

            <Button
              size="lg"
              className="bg-[#4A90E2] hover:bg-[#3A7BC8] text-white px-8 py-6 rounded-xl font-bold"
            >
              Start Free Practice
            </Button>
          </div>

          {/* RIGHT – MY PROGRESS */}
          <div className="bg-white rounded-3xl shadow-xl p-6 max-w-md w-full mx-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-900">My Progress</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: Today, 10:30 AM
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-600">
                Active Session
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { name: "Listening", score: 8.5, icon: LuHeadphones, color: "text-blue-500" },
                { name: "Reading", score: 7.5, icon: LuBookOpen, color: "text-orange-500" },
                { name: "Writing", score: 7.0, icon: LuPenTool, color: "text-purple-500" },
                { name: "Speaking", score: 8.0, icon: LuMic, color: "text-green-500" },
              ].map((s) => (
                <div key={s.name} className="bg-gray-50 rounded-2xl p-4 border">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`${s.color} text-lg`} />
                    <p className="text-xs font-semibold text-gray-500">{s.name}</p>
                  </div>
                  <p className="text-2xl font-black">{s.score}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Target Score
                </p>
                <p className="text-2xl font-black">Band 8.5</p>
              </div>

              <div className="relative w-14 h-14">
                <svg className="-rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray="82 100"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                  82%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUSTED BY ================= */}
      <section className="min-h-screen bg-white flex items-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-12">
            Trusted by students from
          </p>
          <div className="flex flex-wrap justify-center items-center gap-16">
            <span className="text-3xl font-bold text-gray-400">WIUT</span>
            <span className="text-3xl font-bold text-gray-400">TUIT</span>
            <span className="text-3xl font-bold text-gray-400">MDIS</span>
            <span className="text-3xl font-bold text-gray-400">WEBSTER</span>
            <span className="text-3xl font-bold text-gray-400">TSUL</span>
          </div>
        </div>
      </section>

      {/* ================= WHY CHOOSE ================= */}
      <section className="min-h-screen bg-[#F8FAFC] flex items-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">

          <p className="text-center text-xs font-bold tracking-widest text-blue-500 uppercase mb-4">
            Why choose IELTS SIM?
          </p>

          <h2 className="text-center text-4xl font-black text-gray-900 mb-16">
            Because Band 8 doesn't happen by accident 😉
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Full Mock Tests */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <LuFileText className="text-blue-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Full Mock Tests</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Where weak answers go to die — and Band 8s are born. Built to train your brain and your stamina.
              </p>
              <button className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1">
                Learn more <LuArrowRight className="text-xs" />
              </button>
            </div>

            {/* AI Evaluation */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                <LuMic className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">AI Evaluation</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Honest feedback. Zero sugarcoating. Get instant, detailed Writing & Speaking scores based on official IELTS criteria.
              </p>
              <button className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1">
                Try AI Engine <LuArrowRight className="text-xs" />
              </button>
            </div>

            {/* Score Predictor */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <LuTrendingUp className="text-purple-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Score Predictor</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Because "I think I got a 7" isn't a strategy. Your daily practice and see realistic band score predictions that update as you improve.
              </p>
              <button className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1">
                See my score <LuArrowRight className="text-xs" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= OUR IMPACT ================= */}
      <section className="py-20 bg-gradient-to-br from-[#0A3D4A] to-[#0D5266]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-xs font-bold tracking-widest text-blue-400 uppercase mb-12">
            Our Impact
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <h3 className="text-4xl md:text-5xl font-black mb-2">1000+</h3>
              <p className="text-sm text-blue-200">Band 8.0 Achievers</p>
            </div>
            
            <div>
              <h3 className="text-4xl md:text-5xl font-black mb-2">10+</h3>
              <p className="text-sm text-blue-200">Expert Tutors</p>
            </div>
            
            <div>
              <h3 className="text-4xl md:text-5xl font-black mb-2">1,000+</h3>
              <p className="text-sm text-blue-200">Practice Lessons</p>
            </div>
            
            <div>
              <h3 className="text-4xl md:text-5xl font-black mb-2">4.9/5</h3>
              <p className="text-sm text-blue-200">Student Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SUCCESS STORIES ================= */}
      <section className="min-h-screen bg-white flex items-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <p className="text-center text-xs font-bold tracking-widest text-blue-500 uppercase mb-4">
            Success Stories
          </p>
          <h2 className="text-center text-4xl font-black text-gray-900 mb-16">
            People like you. Scores they're proud of.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Dilshodbek R.</h4>
                  <p className="text-xs text-gray-500">WIUT Student</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                "The analytics provided by IELTS SIM were eye-opening. I finally understood why my Writing score was stuck at 6.0 and managed to push it to 7.5 in just 3 weeks."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-xl">📈</span>
                <span className="text-xs font-bold">Improved from 6.0 to 7.5</span>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Sarah Jenkins</h4>
                  <p className="text-xs text-gray-500">International Student</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                "Highly realistic interface. On the actual test day, I felt completely at home because the SIM environment was identical. Achieved a Band 8.5 overall!"
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-xl">🎯</span>
                <span className="text-xs font-bold">Achieved Band 8.5</span>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Azamat K.</h4>
                  <p className="text-xs text-gray-500">TUIT Tech Graduate</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                "I used to struggle with the Speaking section. The feedback provided on the SIM was practical and directly applicable. I jumped from 6.5 to 8.0."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-xl">🚀</span>
                <span className="text-xs font-bold">Improved from 6.5 to 8.0</span>
              </div>
            </div>

            {/* Testimonial 4 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Sarah Jenkins</h4>
                  <p className="text-xs text-gray-500">International Student</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                "Highly realistic interface. On the actual test day, I felt completely at home because the SIM environment was identical. Achieved a Band 8.5 overall!"
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-xl">📊</span>
                <span className="text-xs font-bold">Achieved Band 8.5</span>
              </div>
            </div>

            {/* Testimonial 5 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Azamat K.</h4>
                  <p className="text-xs text-gray-500">MDIS Tech Teacher</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                "I used to struggle with the Speaking section. The feedback provided on the SIM was practical and directly applicable. I jumped from 6.5 to 8.0."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-xl">💪</span>
                <span className="text-xs font-bold">Improved from 6.5 to 8.0</span>
              </div>
            </div>

            {/* Testimonial 6 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Dilshodbek R.</h4>
                  <p className="text-xs text-gray-500">WIUT Student</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                "The analytics provided by IELTS SIM were eye-opening. I finally understood why my Writing score was stuck at 6.0 and managed to push it to 7.5 in just 3 weeks."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-xl">⭐</span>
                <span className="text-xs font-bold">Improved from 6.0 to 7.5</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-2 mx-auto">
              View more <LuArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-32 bg-[#082C36] text-center px-4 rounded-3xl mx-4 my-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest text-blue-300 uppercase mb-4">
            Ready to start?
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
            Ready to finally get the band score you <span className="italic">actually</span> want?
          </h2>
          <p className="text-blue-100 text-sm mb-8 max-w-2xl mx-auto">
            Join 1,000+ students who turned IELTS stress into confidence with IELTS SIM
          </p>
          <Button
            size="lg"
            className="bg-[#4A90E2] hover:bg-[#3A7BC8] text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all"
          >
            Get Started Now <LuArrowRight className="ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;