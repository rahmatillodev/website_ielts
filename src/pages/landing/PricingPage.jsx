import React from "react";
import {
  LuArrowLeft,
  LuLayoutDashboard,
  LuLightbulb,
  LuZap,
  LuCopy,
  LuShieldCheck,
} from "react-icons/lu";
import { FaChartSimple } from "react-icons/fa6";
import { MdSupportAgent } from "react-icons/md";
import { FiSend } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FeatureItem = ({ icon: Icon, title, description }) => (
  <div className="flex gap-4 p-5 bg-white border border-gray-50 rounded-[24px] shadow-sm hover:shadow-md transition-shadow">
    <div className="size-12 bg-[#F0F7FF] rounded-xl flex items-center justify-center shrink-0">
      <Icon className="text-[#4A90E2] size-6" />
    </div>
    <div>
      <h3 className="text-[17px] font-black text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 font-medium leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

const PricingPage = () => {
  const cardHolder = "Umarov Rahmatillo";
  const cardNumber = "8600 4932 1928 4492";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
    alert("Card number copied!");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12 font-sans">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[#4A90E2] font-black text-sm mb-10 hover:opacity-80 transition-opacity uppercase tracking-wider"
      >
        <LuArrowLeft size={20} strokeWidth={3} /> Back to dashboard
      </Link>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Side: Marketing Content */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <span className="inline-block px-4 py-1.5 bg-[#E8F2FF] text-[#4A90E2] rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
              💎 Premium Access
            </span>
            <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] tracking-tight">
              Maximize your band <br /> score potential.
            </h1>
            <p className="text-lg text-gray-500 font-medium max-w-xl leading-relaxed">
              Join thousands of students who achieved 7.5+ by practicing with
              our realistic simulations and detailed analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FeatureItem
              icon={LuLayoutDashboard}
              title="Unlimited Mock Tests"
              description="Full access to our growing library of 50+ Reading & Listening tests."
            />
            <FeatureItem
              icon={FaChartSimple}
              title="Advanced Analytics"
              description="Track your progress by question type and identify weak areas instantly."
            />
            <FeatureItem
              icon={LuLightbulb}
              title="Detailed Explanations"
              description="Understand why an answer is correct with in-depth breakdowns for every question."
            />
            <FeatureItem
              icon={LuZap}
              title="Distraction-Free"
              description="No ads, just focus. Simulate real exam conditions perfectly."
            />
          </div>
        </div>

        {/* Right Side: Payment Card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-xl shadow-blue-100/50">
            {/* Account Status Header */}
            <div className="flex justify-between items-center p-6 bg-gray-50/50 border-b border-gray-100">
              <span className="text-sm font-black text-gray-600 uppercase tracking-tighter">
                Account Status
              </span>
              <span className="px-3 py-1 bg-gray-200 text-primary text-[10px] font-black rounded-lg uppercase tracking-widest">
                ● FREE
              </span>
            </div>

            <div className="p-8 pt-4">
              {/* Price Tag Section */}
              <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-5xl font-black text-gray-900">
                    49,000
                  </span>
                  <span className="text-xl font-semibold text-gray-400">UZS</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-xl font-black text-gray-900">
                    Manual Payment
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    Follow the steps below to activate your premium account.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-black text-gray-400 uppercase tracking-tighter">
                    <span className="size-6 rounded-full bg-blue-50 text-[#4A90E2] flex items-center justify-center text-xs">
                      1
                    </span>
                    Step 1: Transfer Payment
                  </div>

                  {/* Virtual Card Dizayni */}
                  <div className="relative p-6 bg-gray-100 rounded-2xl text-white overflow-hidden group shadow-lg border-dashed border-2 border-gray-500">
                    {/* <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                       <LuShieldCheck size={80} />
                    </div> */}

                    <div className="relative z-10 flex justify-between items-start mb-10">
                      <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                        Local Bank Card
                      </p>
                      <button
                        onClick={copyToClipboard}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors text-primary"
                      >
                        <LuCopy size={18} />
                      </button>
                    </div>

                    <div className="relative z-10 space-y-4">
                      <p className="text-2xl text-black font-black tracking-[4px] font-mono">
                        {cardNumber}
                      </p>
                      <p className="text-sm font-semibold uppercase tracking-widest text-gray-700">
                        {cardHolder}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-center text-gray-400 font-semibold uppercase">
                    Supported banks: Any local bank app
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <div className="flex gap-4 items-start text-sm">
                    <div className="size-6 shrink-0 rounded-full bg-blue-50 text-[#4A90E2] flex items-center justify-center text-xs font-black">
                      2
                    </div>
                    <p className="text-gray-600 font-semibold">
                      Take a Screenshot <br />
                      <span className="text-gray-400 font-medium">
                        Capture the successful transaction receipt.
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-4 items-start text-sm">
                    <div className="size-6 shrink-0 rounded-full bg-blue-50 text-[#4A90E2] flex items-center justify-center text-xs font-black">
                      3
                    </div>
                    <p className="text-gray-600 font-semibold">
                      Verify on Telegram <br />
                      <span className="text-gray-400 font-medium">
                        Send the screenshot to our bot to upgrade.
                      </span>
                    </p>
                  </div>
                </div>

                <Button className="w-full bg-[#4A90E2] hover:bg-blue-600 text-white font-black py-7 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 flex gap-2">
                  <FiSend />
                  Send Screenshot on Telegram
                </Button>

                <div className="flex justify-center gap-6 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase">
                    <LuShieldCheck size={14} /> Secure Process
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase">
                    <MdSupportAgent size={14} /> 24/7 Support
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
