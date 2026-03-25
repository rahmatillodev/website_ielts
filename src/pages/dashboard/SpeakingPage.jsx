import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiSpeakLine } from "react-icons/ri";
import { LuMic } from "react-icons/lu";
import { FaPodcast } from "react-icons/fa6";
import { LuSparkles } from "react-icons/lu";

const CARDS = [
  {
    id: "speaking",
    title: "Speaking",
    description: "TTS questions and voice recording practice.",
    to: "/speaking-library",
    icon: RiSpeakLine,
    color: "bg-blue-50 border-blue-100 text-blue-700",
    iconColor: "text-blue-600",
  },
  {
    id: "shadowing",
    title: "Shadowing",
    description: "Listen and repeat with video practice.",
    to: "/shadowing-library",
    icon: LuMic,
    color: "bg-emerald-50 border-emerald-100 text-emerald-800",
    iconColor: "text-emerald-600",
  },
  {
    id: "podcasts",
    title: "Podcasts",
    description: "Listen to podcasts and practice.",
    to: "/speaking/podcasts",
    icon: FaPodcast,
    color: "bg-violet-50 border-violet-100 text-violet-800",
    iconColor: "text-violet-600",
  },
  {
    id: "tips",
    title: "Tips",
    description: "Learn effective speaking strategies.",
    to: "/speaking/tips",
    icon: LuSparkles,
    color: "bg-blue-50 border-blue-100 text-blue-700",
    iconColor: "text-blue-600",
    disabled: false,
  },
];

const SpeakingPage = () => {
  const navigate = useNavigate();

  return (
  
    <div className="h-[100vh-100px] overflow-hidden flex flex-col items-center w-full bg-gray-50/30">
      <div className="max-w-6xl w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Speaking</h1>
          <p className="text-base text-gray-600 mt-1">Choose a practice mode to get started.</p>
        </div>

     
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const content = (
              <div
                className={`rounded-3xl border p-8 lg:p-10 flex flex-col gap-3 transition-all duration-300 ${
                  card.disabled
                    ? "cursor-not-allowed opacity-80"
                    : "cursor-pointer hover:-translate-y-2 hover:shadow-xl hover:bg-white"
                } ${card.color}`}
              >
                <span className={`w-14 h-14 rounded-xl flex items-center justify-center ${card.iconColor} bg-white/60 shadow-sm`}>
                  <Icon className="w-7 h-7" />
                </span>
                <h2 className="text-2xl font-bold text-gray-900">{card.title}</h2>
                <p className="text-base text-gray-600 leading-relaxed">{card.description}</p>
              </div>
            );

            if (card.disabled || !card.to) {
              return <div key={card.id}>{content}</div>;
            }
            if (card.to.startsWith("/speaking/")) {
              return (
                <Link key={card.id} to={card.to} className="no-underline">
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigate(card.to)}
                className="text-left w-full focus:outline-none"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
      
      
    </div>
  );
};

export default SpeakingPage;