import React, { useState, useMemo } from "react";
import { FaSearch } from "react-icons/fa";
import { IoGridOutline, IoListOutline, IoChevronBack, IoChevronForward } from "react-icons/io5";
import { Input } from "@/components/ui/input";
import ReadingCardOpen from "./cards/ReadingCardOpen";
import PremiumBanner from "@/components/premium_badges/PremiumBanner";
import { useTestStore } from "@/store/testStore";
import ReadingCardLocked from "./cards/ReadingCardLocked";
import { useAuthStore } from "@/store/authStore";

const ReadingPage = () => {
  const [isGridView, setIsGridView] = useState(true);
  const [activeTab, setActiveTab] = useState("All Tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const allTests = useTestStore((state) => state.test_reading);
  const userProfile = useAuthStore((state) => state.userProfile);

  // 1. Qidiruv va Filtr mantiqi
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


  // 2. Pagination mantiqi
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);
  console.log(currentItems);
  

  // Filtr yoki qidiruv o'zgarganda birinchi sahifaga qaytish
  const handleFilterChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col p-8 bg-gray-50 min-h-screen">
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
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab
                    ? "bg-black text-white shadow-lg"
                    : "text-gray-500 hover:bg-white hover:text-gray-900"
                }`}
              >
                {tab}
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
            {/* View Toggle */}
            <button
              onClick={() => setIsGridView(!isGridView)}
              className="p-3.5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 shadow-sm transition-all text-gray-700"
            >
              {isGridView ? <IoListOutline size={22} /> : <IoGridOutline size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Grid yoki List Layout */}
      {currentItems.length > 0 ? (
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
              <ReadingCardOpen
                key={test.id}
                {...test}
                isGridView={isGridView}
              />
            ) : (
              <ReadingCardLocked
                key={test.id}
                title={test.title}
                is_premium={test.is_premium}
                isGridView={isGridView}
              />
            );
          })}
        </div>

      ) : (
        <div className="py-20 text-center text-gray-400 font-bold">Hech narsa topilmadi...</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-12 gap-2">
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
                className={`w-11 h-11 rounded-xl font-bold transition-all ${
                  currentPage === i + 1
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

      <div className="mt-16">
        <PremiumBanner />
      </div>
    </div>
  );
};

export default ReadingPage;