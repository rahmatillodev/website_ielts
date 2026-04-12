import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
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
    <div className="flex flex-col mx-auto bg-gray-50 h-[calc(100vh-64px)] overflow-hidden px-3 md:px-8 font-sans w-full">
      <div className="flex-1 overflow-y-auto pb-8 pt-4">
        <div className={`w-full ${tipId ? "max-w-5xl mx-auto" : "max-w-7xl mx-auto"}`}>
          {!tipId && (
            <header className="mb-6 md:mb-8 shrink-0">
              <button
                type="button"
                onClick={() => navigate("/speaking")}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 w-fit"
              >
                <FaArrowLeft className="w-4 h-4" aria-hidden />
                Back to Speaking
              </button>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">Speaking Tips</h1>
              <p className="max-w-2xl text-sm md:text-base text-gray-500 font-medium tracking-tight">
                Practical IELTS Speaking tips for Part 1, Part 2, Part 3, and high-band strategies.
              </p>
            </header>
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
      </div>
    </div>
  );
}
