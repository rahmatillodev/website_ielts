import React, { useState, useMemo, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { IoGridOutline, IoListOutline, IoChevronBack, IoChevronForward } from "react-icons/io5";
import { Input } from "@/components/ui/input";
import PremiumBanner from "@/components/badges/PremiumBanner";
import { useTestStore } from "@/store/testStore";
import { useAuthStore } from "@/store/authStore";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CardLocked from "../cards/CardLocked";
import CardOpen from "../cards/CardOpen";

const TestsLibraryPage = ({
  title,
  description,
  testData,
  testType = "reading",
  loading,
  loaded,
  fetchTests,
}) => {
  const [isGridView, setIsGridView] = useState(true);
  const [activeTab, setActiveTab] = useState("All Tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const userProfile = useAuthStore((state) => state.userProfile);

  // Ensure allTests is always an array
  const allTests = Array.isArray(testData) ? testData : [];

  // Ensure tests are fetched when component mounts
  useEffect(() => {
    // Fetch if not loaded, or if loaded but no data (allows refetch on empty data)
    const shouldFetch = (!loaded || (loaded && allTests.length === 0)) && !loading && fetchTests;
    if (shouldFetch) {
      fetchTests();
    }
  }, [loaded, loading, fetchTests, allTests.length]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(allTests) || allTests.length === 0) {
      return [];
    }
    return allTests.filter((test) => {
      // Safety check: ensure test exists and has required properties
      if (!test || typeof test !== 'object') {
        return false;
      }

      const matchesSearch = test.title
        ? test.title.toLowerCase().includes(searchQuery.toLowerCase())
        : false;

      const matchesTab =
        activeTab === "All Tests" ||
        (activeTab === "premium" && test.is_premium === true) ||
        (activeTab === "free" && test.is_premium === false);

      return matchesSearch && matchesTab;
    });
  }, [allTests, searchQuery, activeTab]);

  const handleViewChange = (value) => {
    if (value === "grid") {
      setIsGridView(true);
    } else if (value === "list") {
      setIsGridView(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col max-w-screen-2xl mx-auto bg-gray-50 h-full pb-4 px-3 md:px-4">
      <div className="flex-1 flex flex-col py-3 md:py-4">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm md:text-base text-gray-500 font-medium tracking-tight">
            {description}
          </p>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-6 md:mt-8 gap-4">
            {/* Tabs */}
            <div className="flex gap-1.5 md:gap-2 bg-gray-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-gray-200 w-full md:w-auto overflow-x-auto">
              {["All Tests", "free", "premium"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleFilterChange(tab)}
                  className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab
                    ? "bg-black text-white shadow-lg"
                    : "text-gray-500 hover:bg-white hover:text-gray-900"
                    }`}
                >
                  {tab === "All Tests" ? tab : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-80">
                <FaSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm md:text-base" />
                <Input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 md:pl-12 bg-white border-gray-200 rounded-xl md:rounded-2xl h-10 md:h-12 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all text-sm md:text-base"
                  placeholder="Search by title..."
                />
              </div>
              <ToggleGroup
                type="single"
                value={isGridView ? "grid" : "list"}
                onValueChange={handleViewChange}
                className="flex items-center bg-gray-100/80 p-0.5 md:p-1 rounded-lg md:rounded-xl border border-gray-200 shrink-0"
              >
                <ToggleGroupItem
                  value="list"
                  aria-label="List view"
                  className="p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-md data-[state=off]:text-gray-400 hover:text-gray-600"
                >
                  <IoListOutline size={20} className="md:w-6 md:h-6" />
                </ToggleGroupItem>

                <ToggleGroupItem
                  value="grid"
                  aria-label="Grid view"
                  className="p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-md data-[state=off]:text-gray-400 hover:text-gray-600"
                >
                  <IoGridOutline size={20} className="md:w-6 md:h-6" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        {loading  ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <div className="py-20 text-center text-gray-400 font-semibold w-full">
              Loading tests...
            </div>
          </div>
        ) : currentItems.length > 0 ? (
          <div
            className={
              isGridView
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8"
                : "flex flex-col gap-1"
            }
          >
            {currentItems.map((test) => {
              const subscriptionStatus = userProfile?.subscription_status ?? "free";
              const canAccess =
                subscriptionStatus === "premium" || !test.is_premium;

              return canAccess ? (
                <CardOpen
                  key={test.id}
                  {...test}
                  isGridView={isGridView}
                  testType={testType}
                />
              ) : (
                <CardLocked
                  key={test.id}
                  {...test}
                  isGridView={isGridView}
                />
              );
            })}
          </div>
        ) : !loading && allTests.length > 0 ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <div className="py-20 text-center text-gray-400 font-semibold w-full">Hech narsa topilmadi...</div>
          </div>
        ) : null}

        {/* Pagination - show if we have items to paginate */}
        {currentItems.length > 0 && totalPages > 1 && !(loading && allTests.length === 0) && (
          <div className="flex justify-center md:justify-end items-center mt-8 md:mt-12 gap-2 md:mr-8 overflow-x-auto pb-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 md:p-3 rounded-lg md:rounded-xl border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shrink-0"
            >
              <IoChevronBack size={18} className="md:w-5 md:h-5" />
            </button>

            <div className="flex gap-1.5 md:gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all shrink-0 ${currentPage === i + 1
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 md:p-3 rounded-lg md:rounded-xl border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shrink-0"
            >
              <IoChevronForward size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        )}
      </div>
      {/* Always pinned to the bottom */}
      <div className="mt-16">
        <PremiumBanner />
      </div>
    </div>
  );
};

export default TestsLibraryPage;

