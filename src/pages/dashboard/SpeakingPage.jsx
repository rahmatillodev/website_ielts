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
  },
  {
    id: "shadowing",
    title: "Shadowing",
    description: "Listen and repeat with video practice.",
    to: "/shadowing-library",
    icon: LuMic,
  },
  {
    id: "podcasts",
    title: "Podcasts",
    description: "Listen to podcasts and practice.",
    to: "/speaking/podcasts",
    icon: FaPodcast,
  },
  {
    id: "tips",
    title: "Tips",
    description: "Learn effective speaking strategies.",
    to: "/speaking/tips",
    icon: LuSparkles,
    disabled: false,
  },
];

const cardShellClass =
  "rounded-2xl md:rounded-3xl border border-gray-200 bg-white p-6 md:p-8 lg:p-10 flex flex-col gap-3 transition-all duration-300 shadow-sm";

const SpeakingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col mx-auto w-full bg-gray-50 h-[calc(100vh-64px)] overflow-y-auto px-3 md:px-8 pt-4 pb-8">
      <div className="max-w-6xl w-full mx-auto">
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">Speaking</h1>
          <p className="text-sm md:text-base text-gray-500 font-medium tracking-tight">
            Choose a practice mode to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const content = (
              <div
                className={`${cardShellClass} ${
                  card.disabled
                    ? "cursor-not-allowed opacity-80"
                    : "cursor-pointer hover:-translate-y-1 hover:shadow-md"
                }`}
              >
                <span className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-blue-600 bg-gray-100 border border-gray-200">
                  <Icon className="w-6 h-6 md:w-7 md:h-7" />
                </span>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">{card.title}</h2>
                <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">{card.description}</p>
              </div>
            );

            if (card.disabled || !card.to) {
              return <div key={card.id}>{content}</div>;
            }
            if (card.to.startsWith("/speaking/")) {
              return (
                <Link key={card.id} to={card.to} className="no-underline text-inherit">
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigate(card.to)}
                className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-2xl md:rounded-3xl"
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
