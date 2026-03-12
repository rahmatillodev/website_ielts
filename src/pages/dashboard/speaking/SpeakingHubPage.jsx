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
    to: "/speaking/library",
    icon: RiSpeakLine,
    color: "bg-blue-50 border-blue-100 text-blue-700",
    iconColor: "text-blue-600",
  },
  {
    id: "shadowing",
    title: "Shadowing",
    description: "Listen and repeat with video practice.",
    to: "/speaking-practice/shadowing",
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
    id: "more",
    title: "More",
    description: "Coming soon.",
    to: null,
    icon: LuSparkles,
    color: "bg-gray-50 border-gray-100 text-gray-500",
    iconColor: "text-gray-400",
    disabled: true,
  },
];

const SpeakingHubPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Speaking</h1>
        <p className="text-sm text-gray-600 mt-1">Choose a practice mode to get started.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const content = (
            <div
              className={`rounded-xl border p-5 flex flex-col gap-3 transition-all ${
                card.disabled
                  ? "cursor-not-allowed opacity-80"
                  : "cursor-pointer hover:shadow-md hover:border-gray-200"
              } ${card.color}`}
            >
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconColor} bg-white/60`}>
                <Icon className="w-5 h-5" />
              </span>
              <h2 className="font-semibold text-gray-900">{card.title}</h2>
              <p className="text-sm text-gray-600">{card.description}</p>
            </div>
          );

          if (card.disabled || !card.to) {
            return <div key={card.id}>{content}</div>;
          }
          if (card.to.startsWith("/speaking/")) {
            return (
              <Link key={card.id} to={card.to}>
                {content}
              </Link>
            );
          }
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => navigate(card.to)}
              className="text-left w-full"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SpeakingHubPage;
