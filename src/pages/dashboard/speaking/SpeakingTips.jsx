import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import SimpleTips from "./SimpleTips";

const getInitialViewState = () => {
  const saved = localStorage.getItem("speakingTipsLibraryView");
  return saved === "grid";
};

export default function SpeakingTipsPage() {
  const { tipId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGridView, setIsGridView] = useState(getInitialViewState);

  const handleViewChange = (value) => {
    if (value !== "grid" && value !== "list") return;
    localStorage.setItem("speakingTipsLibraryView", value);
    setIsGridView(value === "grid");
  };

  return (
    <div
      className={`mx-auto min-h-screen w-full max-w-7xl font-sans ${
        tipId ? "bg-gray-50/50 px-4 py-6 sm:px-8 sm:py-10" : "bg-white p-6 md:p-10"
      }`}
    >
      {!tipId && (
        <>
          <header className="mb-10">
            <button
              type="button"
              onClick={() => navigate("/speaking")}
              className="group mb-6 flex items-center gap-1 text-slate-500 transition-colors hover:text-blue-600"
            >
              <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              Back to Speaking
            </button>
            <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Speaking Tips</h1>
            <p className="max-w-2xl text-base text-slate-600 md:text-lg">
              Practical IELTS Speaking tips for Part 1, Part 2, Part 3, and high-band strategies.
            </p>
          </header>

        </>
      )}

      <SimpleTips
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={isGridView ? "grid" : "list"}
        onViewChange={handleViewChange}
      />
    </div>
  );
}
