import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
import { Input } from "@/components/ui/input";
// import PremiumBanner from "@/components/badges/PremiumBanner";
// import { useTestStore } from "@/store/testStore";
import { useAuthStore } from "@/store/authStore";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LibraryShimmer } from "@/components/ui/shimmer";
import CardLocked from "../cards/CardLocked";
import CardOpen from "../cards/CardOpen";
import { motion } from "framer-motion";

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
  const [displayedItems, setDisplayedItems] = useState(9); // Initial items to display
  const [isRefreshing, setIsRefreshing] = useState(false); // Track refresh state for button clicks
  const itemsPerLoad = 9; // Items to load per scroll
  const scrollContainerRef = useRef(null);
  const isLoadingMoreRef = useRef(false);

  // Animation variants for card container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  };

  const userProfile = useAuthStore((state) => state.userProfile);
  const location = useLocation();

  // Ensure allTests is always an array
  const allTests = Array.isArray(testData) ? testData : [];

  // Ensure tests are fetched when component mounts or route changes
  // Force refresh if data was cleared (when navigating back from practice page)
  useEffect(() => {
    if (!fetchTests) return;
    
    // Always fetch when route changes to this page (navigating back from practice page)
    // If not loaded or no data, fetch with forceRefresh to ensure fresh data
    // This handles the case when navigating back from practice pages where data was cleared
    const shouldForceRefresh = !loaded || allTests.length === 0;
    
    if (!loading && !isRefreshing) {
      if (shouldForceRefresh) {
        // Force refresh to bypass cache and ensure fresh data
        fetchTests(true);
      } else if (!loaded) {
        // Normal fetch if not loaded
        fetchTests();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, loaded, allTests.length, loading, fetchTests]); // Re-run when route changes or data state changes

  // Reset refreshing state when loading completes
  useEffect(() => {
    if (!loading && isRefreshing) {
      setIsRefreshing(false);
    }
  }, [loading, isRefreshing]);

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

  // Lazy loading: Get items to display
  const currentItems = useMemo(() => {
    return filteredData.slice(0, displayedItems);
  }, [filteredData, displayedItems]);

  // Check if there are more items to load
  const hasMoreItems = displayedItems < filteredData.length;

  // Handle scroll for lazy loading
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMoreRef.current || !hasMoreItems) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load more when user is 200px from bottom
    const threshold = 200;
    
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      isLoadingMoreRef.current = true;
      setDisplayedItems((prev) => Math.min(prev + itemsPerLoad, filteredData.length));
      // Reset loading flag after a short delay
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 300);
    }
  }, [hasMoreItems, filteredData.length, itemsPerLoad]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // Reset displayed items when filtered data changes (filters/search)
  useEffect(() => {
    setDisplayedItems(9);
    // Scroll to top when filter/search changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeTab, searchQuery]);

  const handleFilterChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      // Show shimmer briefly when changing filters if we have data
      if (allTests.length > 0 && !loading) {
        setIsRefreshing(true);
        // Reset after a short delay to show shimmer effect
        setTimeout(() => {
          setIsRefreshing(false);
        }, 300);
      }
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Show shimmer while loading or refreshing
  if (loading || isRefreshing) {
    return <LibraryShimmer isGridView={isGridView} count={displayedItems} />;
  }

  return (
    <div className="flex flex-col mx-auto bg-gray-50 h-[calc(100vh-64px)] overflow-hidden px-3 md:px-8">
      
      <div className="bg-gray-50 pt-4 pb-4 md:pb-6 shrink-0"> 
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm md:text-base text-gray-500 font-medium tracking-tight w-full md:w-8/12">
          {description}
        </p>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 md:mt-4 gap-4">
          <div className="flex gap-1.5 md:gap-2 bg-gray-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-gray-200 w-full md:w-auto overflow-x-auto">
            {["All Tests", "free", "premium"].map((tab) => (
              <button
                key={tab}
                onClick={() => handleFilterChange(tab)}
                className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-white hover:text-gray-900"
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

        {/* Scrollable Cards Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pb-4 -mx-3 md:-mx-8 px-3 md:px-8"
        >
          {currentItems.length > 0 ? (
            <>
              <motion.div
                className={
                  isGridView
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-16"
                    : "flex flex-col gap-1 mb-16"
                }
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={`${activeTab}-${searchQuery}-${isGridView}`}
              >
                {currentItems.map((test, index) => {
                  const subscriptionStatus = userProfile?.subscription_status ?? "free";
                  const canAccess =
                    subscriptionStatus === "premium" || !test.is_premium;

                  return (
                    <motion.div
                      key={test.id}
                      variants={itemVariants}
                      layout
                    >
                      {canAccess ? (
                        <CardOpen
                          {...test}
                          isGridView={isGridView}
                          testType={testType}
                        />
                      ) : (
                        <CardLocked
                          {...test}
                          isGridView={isGridView}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
              
              {/* Loading indicator when loading more */}
              {hasMoreItems && (
                <div className="flex justify-center items-center py-8">
                  <div className="text-sm text-gray-400 font-medium">
                    Loading more...
                  </div>
                </div>
              )}
            </>
          ) : !loading && allTests.length > 0 ? (
            <div className="flex flex-1 items-center justify-center min-h-[300px]">
              <div className="py-20 text-center text-gray-400 font-semibold w-full">Hech narsa topilmadi...</div>
            </div>
          ) : null}
        </div>
      </div>
  );
};

export default TestsLibraryPage;

