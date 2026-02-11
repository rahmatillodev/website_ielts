import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaArrowRight, FaHistory, FaSearch } from "react-icons/fa";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
import { Input } from "@/components/ui/input";
// import PremiumBanner from "@/components/badges/PremiumBanner";
// import { useTestStore } from "@/store/testStore";
import { useAuthStore } from "@/store/authStore";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_GROUPS, getQuestionTypeDisplayName } from "@/store/testStore/utils/questionTypeUtils";
import CardLocked from "./cards/CardLocked";
import CardOpen from "./cards/CardOpen";
import { motion } from "framer-motion";
import { LibraryCardShimmer } from "@/components/ui/shimmer";
import { Button } from "./ui/button";


const TestsLibraryPage = ({
  title,
  description,
  testData,
  testType = "reading",
  loading,
  fetchTests,
  dashboardLoading = false,
  emptyStateMessage = "",
  emptyFreeMessage = "",
  emptyPremiumMessage = "",
  emptySearchMessage = "",
  customHeight = "h-[calc(100vh-64px)]",
  headerAction = null,
  headerActionText = "Practice Now",
}) => {

  // Load view preference from localStorage, default to list view (false)
  const getInitialViewState = () => {
    const savedView = localStorage.getItem(`testsLibraryView`);
    return savedView === "grid" ? true : false;
  };

  const [isGridView, setIsGridView] = useState(getInitialViewState);
  const [activeTab, setActiveTab] = useState("All Tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [questionType, setQuestionType] = useState("all"); // Filter by question type
  const [displayedItems, setDisplayedItems] = useState(9); // Initial items to display
  const itemsPerLoad = 9; // Items to load per scroll
  const scrollContainerRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const hasFetchedRef = useRef(false); // Track if we've attempted a fetch
  const loadingTimeoutRef = useRef(null); // Safety timeout ref

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
  // Only fetch on initial mount or route change, not when data is empty
  useEffect(() => {
    if (!fetchTests) return;

    // Only fetch if we haven't fetched yet for this route
    if (!hasFetchedRef.current && !loading) {
      hasFetchedRef.current = true;
      fetchTests(false); // Don't force refresh on initial load
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, fetchTests]); // Re-run when route changes

  // Reset fetch flag when route changes to allow fresh fetch
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [location.pathname]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(allTests) || allTests.length === 0) {
      return [];
    }
    const filtered = allTests.filter((test) => {
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

      // Filter by question type
      // Handle both Set and Array for backward compatibility
      const matchesQuestionType = questionType === "all" ||
        (test.question_types && (
          (test.question_types instanceof Set && test.question_types.has(questionType)) ||
          (Array.isArray(test.question_types) && test.question_types.includes(questionType))
        ));

      return matchesSearch && matchesTab && matchesQuestionType;
    });
    return filtered;
  }, [allTests, searchQuery, activeTab, questionType]);

  const handleViewChange = (value) => {
   
    localStorage.setItem('testsLibraryView', value);
    setIsGridView(value === 'grid' ? true : false);
  };

  // Lazy loading: Get items to display
  const currentItems = useMemo(() => {
    const items = filteredData.slice(0, displayedItems);
    return items;
  }, [filteredData, displayedItems]);

  // Check if there are more items to load
  const hasMoreItems = displayedItems < filteredData.length;

  // Handle scroll for lazy loading
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMoreRef.current) return;

    // Check hasMoreItems dynamically to avoid stale closures
    const currentHasMore = displayedItems < filteredData.length;
    if (!currentHasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load more when user is 200px from bottom
    const threshold = 200;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      isLoadingMoreRef.current = true;
      setDisplayedItems((prev) => {
        const newValue = Math.min(prev + itemsPerLoad, filteredData.length);
        // Reset loading flag after state update
        setTimeout(() => {
          isLoadingMoreRef.current = false;
        }, 300);
        return newValue;
      });
    }
  }, [displayedItems, filteredData.length, itemsPerLoad]);

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
    isLoadingMoreRef.current = false; // Reset loading flag when filters change
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    // console.log("[TestsLibraryPage] activeTab/searchQuery/questionType changed, reset displayedItems to 9", { activeTab, searchQuery, questionType });
  }, [activeTab, searchQuery, questionType]);

  // Check if we need to load more items initially or after filter changes
  // This handles cases where initial content doesn't fill the viewport
  useEffect(() => {
    if (loading || dashboardLoading || filteredData.length === 0) {
      // console.log("[TestsLibraryPage] Skipping load more items on init/filter-change due to loading/dashboardLoading/empty filteredData", { loading, dashboardLoading, filteredDataLen: filteredData.length });
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      // console.log("[TestsLibraryPage] No scrollContainerRef on load-more-check");
      return;
    }

    // Function to check and load more if needed
    let checkCount = 0;
    const maxChecks = 10; // Prevent infinite loops

    const checkAndLoadMore = () => {
      if (isLoadingMoreRef.current || checkCount >= maxChecks) return;
      checkCount++;

      requestAnimationFrame(() => {
        const { scrollHeight, clientHeight } = container;
        // Use functional update to get latest displayedItems
        setDisplayedItems((prev) => {
          const currentHasMore = prev < filteredData.length;

          // If content doesn't fill viewport and there are more items, load more
          if (scrollHeight <= clientHeight && currentHasMore) {
            isLoadingMoreRef.current = true;
            const newValue = Math.min(prev + itemsPerLoad, filteredData.length);

            // console.log("[TestsLibraryPage] Initial load: Not enough content, loading more", { prev, newValue, scrollHeight, clientHeight, filteredDataLen: filteredData.length });

            // After loading, check again if more is needed
            setTimeout(() => {
              isLoadingMoreRef.current = false;
              // Recursively check if viewport still isn't filled
              setTimeout(checkAndLoadMore, 200);
            }, 300);

            return newValue;
          }

          return prev;
        });
      });
    };

    // Initial check after a delay to ensure DOM has rendered
    const timeoutId = setTimeout(checkAndLoadMore, 300);
    return () => clearTimeout(timeoutId);
  }, [filteredData.length, loading, dashboardLoading, itemsPerLoad]);

  const handleFilterChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      // console.log("[TestsLibraryPage] Changed activeTab", tab);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // console.log("[TestsLibraryPage] Changed searchQuery", e.target.value);
  };

  // Safety guard: Prevent infinite loading state
  // If loading is still true after 5 seconds, force it to false
  useEffect(() => {
    if (loading) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Set a safety timeout
      loadingTimeoutRef.current = setTimeout(() => {
        // This is a safety measure - the store should handle this, but if it doesn't,
        // we log a warning. The store's finally block should prevent this from happening.
        console.warn('[TestsLibraryPage] Loading state exceeded 5 seconds. This may indicate a store issue.');
      }, 5000);
      // console.log("[TestsLibraryPage] loading became true");
    } else {
      // Clear timeout if loading becomes false
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      // console.log("[TestsLibraryPage] loading became false");
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading]);

  // Additional logging after currentItems calculated
  // useEffect(() => {
  //   console.log("[TestsLibraryPage] Post-calc: currentItems", currentItems);
  // }, [currentItems]);

  return (
    <div className={`flex flex-col mx-auto bg-gray-50 ${customHeight} overflow-hidden px-3 md:px-8`}>
      {/* Sticky Header */}
      <div className="bg-gray-50 pt-4 pb-2 md:pb-4 shrink-0 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 md:mt-4 gap-4">
          <div className="flex flex-col gap-2 md:gap-3 w-full md:w-auto">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">{title}</h1>
            <p className="text-sm md:text-base text-gray-500 font-medium tracking-tight w-full md:w-8/12">
              {description}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            {
              testType === "writing" && (
                <div className="flex justify-end">
                  <Link to="/writing/writing-history" className="text-sm bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-all duration-200 flex items-center gap-2">
                    <FaHistory className="w-4 h-4" />
                    Writing History
                  </Link>
                </div>
              )
            }
            {headerAction && (
              <div className="flex justify-end">
                <Link to={headerAction} className="text-sm bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-all duration-200 flex items-center gap-2">
                  {headerActionText}
                  <FaArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 md:mt-4 gap-4">
          <div className="flex gap-1.5 md:gap-2 bg-gray-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-gray-200 w-full md:w-auto overflow-x-auto">
            {["All Tests", "free", "premium"].map((tab) => (
              <button
                key={tab}
                onClick={() => handleFilterChange(tab)}
                className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-white hover:text-gray-900"
                  }`}
              >
                {tab === "All Tests" ? tab : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 md:gap-3 w-full md:w-auto">

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
                className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200 shrink-0 gap-1"
              >
                <ToggleGroupItem
                  value="list"
                  aria-label="List view"
                  className="flex items-center justify-center p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 
               data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm
               data-[state=off]:text-gray-400 hover:text-gray-600 
               [&:not(:first-child)]:rounded-lg [&:not(:last-child)]:rounded-lg"
                >
                  <IoListOutline size={20} className="md:w-6 md:h-6" />
                </ToggleGroupItem>

                <ToggleGroupItem
                  value="grid"
                  aria-label="Grid view"
                  className="flex items-center justify-center p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 
               data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm
               data-[state=off]:text-gray-400 hover:text-gray-600
               [&:not(:first-child)]:rounded-lg [&:not(:last-child)]:rounded-lg"
                >
                  <IoGridOutline size={20} className="md:w-6 md:h-6" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-4 -mx-3 md:-mx-8 px-3 md:px-8 pt-4"
      >
        {/* First Priority: Loading State - Show skeleton loaders when loading and no data */}
        {(loading || dashboardLoading) && allTests.length === 0 ? (
          <>
            {/* {console.log("[TestsLibraryPage] [RENDER] State=loading/dashboardLoading && allTests.length===0", { loading, dashboardLoading, allTests })} */}
            <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mb-16" : "flex flex-col gap-1 mb-16"}>
              {Array.from({ length: 9 }).map((_, index) => (
                <LibraryCardShimmer key={index} isGridView={isGridView} />
              ))}
            </div>
          </>
        ) : /* Second Priority: Empty State - Show empty message when not loading and no data */
          !loading && !dashboardLoading && allTests.length === 0 ? (
            <>
              {/* {console.log("[TestsLibraryPage] [RENDER] State=not loading && not dashboardLoading && allTests.length===0", { loading, dashboardLoading, allTests })} */}
              <div className="flex flex-1 items-center justify-center min-h-[300px]">
                {emptyStateMessage ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex flex-col items-center text-center gap-2 py-16"
                  >
                    <div className="text-gray-700 font-semibold text-base md:text-lg whitespace-pre-line">
                      {emptyStateMessage}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex flex-col items-center text-center gap-2 py-16"
                  >
                    <div className="text-gray-700 font-semibold text-base md:text-lg">
                      We couldn't find any {testType === "listening" ? "listening" : "reading"} materials at the moment.
                    </div>
                    <div className="text-gray-400 text-sm md:text-base">
                      Please check back later or try again soon.
                    </div>
                  </motion.div>
                )}
              </div>
            </>
          ) : /* Third Priority: No Search Results - Show message when data exists but filtered results are empty */
            allTests.length > 0 && filteredData.length === 0 ? (
              <>
                {/* {console.log("[TestsLibraryPage] [RENDER] State=allTests exist, filteredData.length===0", { allTests, filteredData, searchQuery, activeTab })} */}
                <div className="flex flex-1 items-center justify-center min-h-[300px]">
                  <div className="py-20 text-center text-gray-400 font-semibold w-full whitespace-pre-line">
                    {searchQuery.trim() !== "" && emptySearchMessage ? (
                      emptySearchMessage
                    ) : activeTab === "free" && emptyFreeMessage ? (
                      emptyFreeMessage
                    ) : activeTab === "premium" && emptyPremiumMessage ? (
                      emptyPremiumMessage
                    ) : searchQuery.trim() !== "" ? (
                      "No results match your search."
                    ) : activeTab === "free" ? (
                      "No free tests available."
                    ) : activeTab === "premium" ? (
                      "No premium tests available."
                    ) : (
                      "No results found."
                    )}
                  </div>
                </div>
              </>
            ) : /* Fourth Priority: Show Data - Only show cards when not loading and we have items */
              currentItems.length > 0 ? (
                <>
                  {/* {console.log("[TestsLibraryPage] [RENDER] State=Show Data", { loading, dashboardLoading, currentItems, filteredData, allTests })} */}
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
                      const canAccess = subscriptionStatus === "premium" || !test.is_premium;

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
                              testType={test.testType ?? testType}
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
              ) : (
                (() => {
                  console.log(
                    "[TestsLibraryPage] [RENDER] State=null catchall",
                    {
                      loading,
                      dashboardLoading,
                      currentItems,
                      filteredData,
                      allTests,
                      reason: "All other render branches failed"
                    }
                  );
                  return null;
                })()
              )}
      </div>
    </div>
  );
};

export default TestsLibraryPage;