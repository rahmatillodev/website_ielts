import React, { useState, useMemo } from "react";
import { FaSearch } from "react-icons/fa";
import {
  IoGridOutline,
  IoListOutline,
  IoChevronBack,
  IoChevronForward,
} from "react-icons/io5";
import { Input } from "@/components/ui/input";
import PremiumBanner from "@/components/premium_badges/PremiumBanner";
import { useTestStore } from "@/store/testStore";
import { useAuthStore } from "@/store/authStore";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ReadingCardOpen from "../../../components/cards/CardOpen";
import ReadingCardLocked from "../../../components/cards/CardLocked";

const TABS = [
  { key: "All Tests", label: "All" },
  { key: "free", label: "Free" },
  { key: "premium", label: "Premium" },
];

const ListeningPage = () => {
  const [isGridView, setIsGridView] = useState(true);
  const [activeTab, setActiveTab] = useState("All Tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const allTests = useTestStore((state) => state.test_listening);
  const userProfile = useAuthStore((state) => state.userProfile);

  // Filtering and Searching Logic
  const filteredData = useMemo(() => {
    return allTests.filter((test) => {
      const matchesSearch = test.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTab =
        activeTab === "All Tests" ||
        (activeTab === "premium" && test.is_premium === true) ||
        (activeTab === "free" && test.is_premium === false);
      return matchesSearch && matchesTab;
    });
  }, [allTests, searchQuery, activeTab]);

  const handleViewChange = (value) => {
    setIsGridView(value === "grid");
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // When filter/search changes, go back to first page
  const handleFilterChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Animating button
  const tabButtonCls = (tab) =>
    `px-7 py-2 rounded-xl text-base font-bold focus:outline-none flex items-center gap-2 
    transition-all duration-200 shadow-sm
    ${
      activeTab === tab
        ? "bg-linear-to-tr from-blue-600 to-indigo-500 text-white shadow-xl scale-105 ring-2 ring-blue-100"
        : "text-gray-600 bg-white hover:bg-blue-50 hover:scale-[1.01] ring-1 ring-gray-100"
    }`;

  return (
    <div className="flex flex-col max-w-screen-2xl mx-auto p-2 sm:p-8 bg-linear-to-b from-blue-50/30 to-[#f6faff] min-h-screen font-inter">
      <div className="mb-10">
        <h1 className="text-4xl sm:text-4xl md:text-5xl font-black text-blue-900 mb-3 tracking-tight leading-tight drop-shadow-sm">
          Listening Library
        </h1>
        <p className="text-gray-500 font-medium tracking-tight text-lg mb-2">
          <span className="inline-block pr-1 font-semibold text-blue-500">
            Simulate
          </span>
          the actual listening test environment. Each test contains{" "}
          <span className="font-bold text-indigo-500">4 parts</span> and{" "}
          <span className="font-bold text-indigo-500">40 questions</span>.
        </p>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-8 gap-4 w-full">
          {/* Tabs */}
          <div className="flex flex-1 gap-4 bg-white/60 shadow border border-gray-200 p-2 rounded-2xl">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={tabButtonCls(key)}
                aria-pressed={activeTab === key}
                tabIndex={0}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search & View Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-80">
              <FaSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"
                size={18}
              />
              <Input
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-12 bg-white border border-gray-200 rounded-2xl h-12 shadow focus:ring-2 focus:ring-blue-100 font-medium text-lg transition-all"
                placeholder="Search listening test..."
              />
            </div>
            {/* View Toggle */}
            <ToggleGroup
              type="single"
              value={isGridView ? "grid" : "list"}
              onValueChange={handleViewChange}
              className="inline-flex items-center justify-center rounded-[18px] bg-linear-to-r from-blue-50 to-indigo-100/50 p-2 gap-2 ring-1 ring-blue-100 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
            >
              <ToggleGroupItem
                value="list"
                className="relative text-xl font-semibold transition-all duration-150 rounded-xl border-2 border-transparent data-[state=on]:bg-white data-[state=on]:text-indigo-600 data-[state=on]:shadow-xl data-[state=on]:border-indigo-200 data-[state=off]:text-gray-500 hover:data-[state=off]:bg-white hover:data-[state=off]:shadow focus:outline-none focus:ring-0"
                aria-label="Show as list"
              >
                <IoListOutline size={35} />
              </ToggleGroupItem>
              <div className="h-9 w-px bg-linear-to-b from-blue-400/30 via-gray-200 to-white"></div>
              <ToggleGroupItem
                value="grid"
                className="relative text-xl font-semibold transition-all duration-150 rounded-xl border-2 border-transparent data-[state=on]:bg-white data-[state=on]:text-indigo-600 data-[state=on]:shadow-xl data-[state=on]:border-indigo-200 data-[state=off]:text-gray-500 hover:data-[state=off]:bg-white hover:data-[state=off]:shadow focus:outline-none focus:ring-0"
                aria-label="Show as grid"
              >
                <IoGridOutline size={35} />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Grid or List Layout */}
      <div className="flex-1">
        {currentItems.length > 0 ? (
          <div
            className={
              isGridView
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadein"
                : "flex flex-col gap-2 animate-fadein"
            }
          >
            {currentItems.map((test) => {
              const subscriptionStatus =
                userProfile?.subscription_status ?? "free";
              const canAccess =
                subscriptionStatus === "premium" || !test.is_premium;

              return canAccess ? (
                <ReadingCardOpen
                  key={test.id}
                  {...test}
                  isGridView={isGridView}
                  link={`/listening-practice/${test.id}`}
                />
              ) : (
                <ReadingCardLocked
                link={`/listening-practice/${test.id}`}
                  key={test.id}
                  {...test}
                  isGridView={isGridView}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-20 md:py-40 text-center text-gray-400 font-bold text-xl flex flex-col gap-2 items-center justify-center animate-fadein">
            <span>
              {/* <svg
                className="mx-auto mb-3"
                width="56"
                height="56"
                fill="none"
                viewBox="0 0 56 56"
              >
                <ellipse fill="#DFEFFF" cx="28" cy="28" rx="28" ry="28" />
                <path
                  fill="#A5B8D7"
                  d="M17 26c.8-3.6 4.1-7 10.9-7 7.2 0 10.5 3.6 10.9 7 .1.8-.4 1.6-1.3 1.7-1.6.2-5.3.3-9.6.3s-8-.1-9.6-.3c-.9-.1-1.4-.9-1.3-1.7Zm3.3 6.4a1 1 0 0 1 1.4 0c1.9 2 5.6 3.3 9.3 3.3s7.4-1.3 9.3-3.3a1 1 0 1 1 1.4 1.4c-2.4 2.6-7 4-10.7 4h-.1c-3.7 0-8.2-1.4-10.7-4a1 1 0 0 1 0-1.4Z"
                />
              </svg> */}
            </span>
            <span>Nothing found... Try a different search.</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-14 gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`group p-3 rounded-xl border font-bold bg-white shadow-sm hover:bg-blue-50 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              currentPage === 1 ? "" : "hover:scale-105 active:scale-100"
            }`}
            aria-label="Previous page"
          >
            <IoChevronBack
              size={20}
              className="group-hover:text-blue-500 text-gray-500 transition"
            />
          </button>
          <div className="flex gap-1 sm:gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-11 h-11 md:w-11 md:h-11 rounded-xl font-bold text-base flex items-center justify-center transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  currentPage === i + 1
                    ? "bg-linear-to-br from-blue-500 to-indigo-400 text-white shadow-lg scale-110"
                    : "bg-white border text-gray-500 hover:bg-blue-50 hover:text-blue-500 hover:scale-105"
                }`}
                aria-current={currentPage === i + 1}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`group p-3 rounded-xl border font-bold bg-white shadow-sm hover:bg-blue-50 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              currentPage === totalPages
                ? ""
                : "hover:scale-105 active:scale-100"
            }`}
            aria-label="Next page"
          >
            <IoChevronForward
              size={20}
              className="group-hover:text-blue-500 text-gray-500 transition"
            />
          </button>
        </div>
      )}

      <div className="mt-20 mb-10">
        <PremiumBanner />
      </div>
      {/* Extra little motion at bottom */}
      <div className="mt-4 flex flex-col items-center opacity-70 animate-pulse-fast text-xs">
        <span>
          <span role="img" aria-label="ear" className="mr-1">👂</span>
          More IELTS listening tests coming soon!
        </span>
      </div>
    </div>
  );
};

export default ListeningPage;