import React, { useState, useMemo, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { IoGridOutline, IoListOutline, IoChevronBack, IoChevronForward } from "react-icons/io5";
import { Input } from "@/components/ui/input";
import PremiumBanner from "@/components/premium_badges/PremiumBanner";
import { useTestStore } from "@/store/testStore";
import { useAuthStore } from "@/store/authStore";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CardLocked from "../../../components/cards/CardLocked";
import CardOpen from "../../../components/cards/CardOpen";

const ReadingPage = () => {
  const [isGridView, setIsGridView] = useState(true);
  const [activeTab, setActiveTab] = useState("All Tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Get store state and actions
  const testReading = useTestStore((state) => state.test_reading);
  const loading = useTestStore((state) => state.loading);
  const loaded = useTestStore((state) => state.loaded);
  const fetchTests = useTestStore((state) => state.fetchTests);
  const userProfile = useAuthStore((state) => state.userProfile);

  // Ensure allTests is always an array
  const allTests = Array.isArray(testReading) ? testReading : [];

  // Ensure tests are fetched when component mounts
  useEffect(() => {
    if (!loaded && !loading) {
      fetchTests();
    }
  }, [loaded, loading, fetchTests]);

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


  // 2. Pagination mantiqi
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
    <div className="flex flex-col max-w-screen-2xl mx-auto bg-gray-50 h-full pb-4 px-4">
      <div className="flex-1 flex flex-col py-4">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Reading Library</h1>
          <p className="text-gray-500 font-medium tracking-tight">
            Simulate the actual reading test environment. Each test contains 4 parts and 40 questions.
          </p>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-8 gap-4">
            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200">
              {["All Tests", "free", "premium"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleFilterChange(tab)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                    ? "bg-black text-white shadow-lg"
                    : "text-gray-500 hover:bg-white hover:text-gray-900"
                    }`}
                >
                  {tab === "All Tests" ? tab : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-80">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-12 bg-white border-gray-200 rounded-2xl h-12 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Search by title..."
                />
              </div>
              <ToggleGroup
                type="single"
                value={isGridView ? "grid" : "list"}
                onValueChange={handleViewChange}
                className="inline-flex items-center justify-center rounded-2xl bg-gray-50 p-2 gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              >
                <ToggleGroupItem
                  value="list"
                  className="relative px-7 py-5 text-base font-semibold transition-all duration-200 rounded-xl border-2 border-transparent data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-lg data-[state=on]:shadow-blue-100 data-[state=on]:border-blue-200 data-[state=off]:text-gray-500 hover:data-[state=off]:bg-white hover:data-[state=off]:shadow-sm focus:outline-none focus:ring-0"
                >
                  <IoListOutline size={28} />
                </ToggleGroupItem>

                <div className="h-10 w-px bg-gray-300" />

                <ToggleGroupItem
                  value="grid"
                  className="relative px-7 py-5 text-base font-semibold transition-all duration-200 rounded-xl border-2 border-transparent data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-lg data-[state=on]:shadow-blue-100 data-[state=on]:border-blue-200 data-[state=off]:text-gray-500 hover:data-[state=off]:bg-white hover:data-[state=off]:shadow-sm focus:outline-none focus:ring-0"
                >
                  <IoGridOutline size={28} />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        {loading && allTests.length === 0 ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <div className="py-20 text-center text-gray-400 font-bold w-full">
              Loading tests...
            </div>
          </div>
        ) : currentItems.length > 0 ? (
          <div
            className={
              isGridView
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
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
            <div className="py-20 text-center text-gray-400 font-bold w-full">Hech narsa topilmadi...</div>
          </div>
        ) : null}

        {/* Pagination - show if we have items to paginate */}
        {currentItems.length > 0 && totalPages > 1 && !(loading && allTests.length === 0) && (
          <div className="flex justify-end items-center mt-12 gap-2 mr-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-xl border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all"
            >
              <IoChevronBack size={20} />
            </button>

            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-11 h-11 rounded-xl font-bold transition-all ${currentPage === i + 1
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
              className="p-3 rounded-xl border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all"
            >
              <IoChevronForward size={20} />
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

export default ReadingPage;