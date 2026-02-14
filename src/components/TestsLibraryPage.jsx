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
import { WRITING_TASK_TYPES, getWritingTaskTypeDisplayName } from "@/store/testStore/utils/writingTaskTypeUtils";
import CardLocked from "./cards/CardLocked";
import CardOpen from "./cards/CardOpen";
import { motion } from "framer-motion";
import { LibraryCardShimmer } from "@/components/ui/shimmer";
import { useResponsiveGridCols } from "@/hooks/useResponsiveGridCols";
import { CiFilter } from "react-icons/ci";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]); // Multi-select question types (for reading/listening)
  const [selectedTaskTypes, setSelectedTaskTypes] = useState([]); // Multi-select task types (for writing)
  const [sortOrder, setSortOrder] = useState("oldest"); // Sort by oldest/newest
  const [filterOpen, setFilterOpen] = useState(false); // Control filter popover
  const [tempSelectedTypes, setTempSelectedTypes] = useState([]); // Temporary state for filter panel
  const [tempSortOrder, setTempSortOrder] = useState("oldest"); // Temporary sort state
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

      // Filter by question type (for reading/listening) or task type (for writing)
      let matchesType = true;
      if (testType === "writing") {
        // For writing: filter by task types
        matchesType = selectedTaskTypes.length === 0 ||
          (test.task_types && (
            (test.task_types instanceof Set && selectedTaskTypes.some(type => test.task_types.has(type))) ||
            (Array.isArray(test.task_types) && selectedTaskTypes.some(type => test.task_types.includes(type)))
          ));
      } else {
        // For reading/listening: filter by question types
        matchesType = selectedQuestionTypes.length === 0 ||
          (test.question_types && (
            (test.question_types instanceof Set && selectedQuestionTypes.some(type => test.question_types.has(type))) ||
            (Array.isArray(test.question_types) && selectedQuestionTypes.some(type => test.question_types.includes(type)))
          ));
      }

      return matchesSearch && matchesTab && matchesType;
    });
    // Sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return sorted;
  }, [allTests, searchQuery, activeTab, selectedQuestionTypes, selectedTaskTypes, sortOrder, testType]);

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
    // console.log("[TestsLibraryPage] activeTab/searchQuery/selectedQuestionTypes/selectedTaskTypes/sortOrder changed, reset displayedItems to 9", { activeTab, searchQuery, selectedQuestionTypes, selectedTaskTypes, sortOrder });
  }, [activeTab, searchQuery, selectedQuestionTypes, selectedTaskTypes, sortOrder]);

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

  // Filter panel handlers
  const handleFilterOpen = () => {
    if (testType === "writing") {
      setTempSelectedTypes([...selectedTaskTypes]);
    } else {
      setTempSelectedTypes([...selectedQuestionTypes]);
    }
    setTempSortOrder(sortOrder);
    setFilterOpen(true);
  };

  const handleFilterClose = () => {
    setFilterOpen(false);
  };

  const handleFilterCancel = () => {
    if (testType === "writing") {
      setTempSelectedTypes([...selectedTaskTypes]);
    } else {
      setTempSelectedTypes([...selectedQuestionTypes]);
    }
    setTempSortOrder(sortOrder);
    setFilterOpen(false);
  };

  const handleFilterClear = () => {
    // Reset temp states
    setTempSelectedTypes([]);
    setTempSortOrder("oldest");
  
    // Reset real filter states
    if (testType === "writing") {
      setSelectedTaskTypes([]);
    } else {
      setSelectedQuestionTypes([]);
    }
  
    setSortOrder("oldest");
    handleFilterClose()
  };
  

  const handleFilterSearch = () => {
    if (testType === "writing") {
      setSelectedTaskTypes([...tempSelectedTypes]);
    } else {
      setSelectedQuestionTypes([...tempSelectedTypes]);
    }
    setSortOrder(tempSortOrder);
    setFilterOpen(false);
  };

  const toggleType = (type) => {
    setTempSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
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

  const cols = useResponsiveGridCols();


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
          <div className="flex justify-end gap-3">
            {testType === "writing" && (
              <div className="flex justify-end">
                <Link
                  to="/writing/writing-history"
                  className="text-sm bg-gray-200 text-black px-4 py-2 rounded-md 
                   hover:bg-gray-300 transition-all duration-200 
                   flex items-center gap-2"
                >
                  <FaHistory className="w-4 h-4" />
                  Writing History
                </Link>
              </div>
            )}

            {headerAction && (
              <div className="flex justify-end">
                <Link
                  to={headerAction}
                  className="text-sm bg-blue-500 text-white px-4 py-2 rounded-md 
                   hover:bg-blue-700 transition-all duration-200 
                   flex items-center gap-2"
                >
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

            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto ">
              {/* filter question_type or task_type */}
              {(testType === "reading" || testType === "listening" || testType === "writing") && (
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={handleFilterOpen}
                      className="relative rounded-2xl bg-white border-2 border-gray-300 shadow-md text-base focus:ring-2 focus:ring-blue-500 transition-all flex items-center justify-center hover:bg-gray-50 hover:border-blue-400 hover:shadow-lg"
                      style={{
                        width: "48px",
                        height: "48px",
                      }}
                    >
                      <CiFilter className="w-6 h-6" />
                      {((testType === "writing" && selectedTaskTypes.length > 0) || 
                        ((testType === "reading" || testType === "listening") && selectedQuestionTypes.length > 0)) && (
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md">
                          {testType === "writing" ? selectedTaskTypes.length : selectedQuestionTypes.length}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    className={cn(
                      "z-50 w-[380px] rounded-xl border bg-white p-4 shadow-lg"
                    )}
                  >
                    {/* Question Types or Task Types Section */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {testType === "writing" ? "Task Types" : "Question Types"}
                        </h3>
                        <Button
                          onClick={handleFilterClear}
                          variant="ghost"
                          className="text-sm text-gray-600 hover:text-gray-900 p-0 h-auto border-none hover:bg-transparent"
                        >
                          Clear All
                        </Button>

                      </div>
                      <div className="">
                        {(testType === "writing" ? WRITING_TASK_TYPES : QUESTION_TYPE_GROUPS).map((type) => {
                          const isChecked = tempSelectedTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleType(type)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer accent-blue-600"
                              />
                              <span className="text-sm text-gray-700 font-medium">
                                {testType === "writing" 
                                  ? getWritingTaskTypeDisplayName(type)
                                  : getQuestionTypeDisplayName(type)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="border-t border-gray-200 my-2" />

                    {/* Sort Section */}
                    <div className="mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Sort By</h3>
                      <div className="space-y-0.5">
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            name="sortOrder"
                            value="newest"
                            checked={tempSortOrder === "newest"}
                            onChange={() => setTempSortOrder("newest")}
                            className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 font-medium">Newest First</span>
                        </label>
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            name="sortOrder"
                            value="oldest"
                            checked={tempSortOrder === "oldest"}
                            onChange={() => setTempSortOrder("oldest")}
                            className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 font-medium">Oldest First</span>
                        </label>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">

                      <Button
                        onClick={handleFilterCancel}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleFilterSearch}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Search
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
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
            <div className={isGridView ? `grid ${cols} gap-4 md:gap-6 lg:gap-8 mb-16` : "flex flex-col gap-1 mb-16"}>
              {Array.from({ length: 9 }).map((_, index) => (
                <LibraryCardShimmer key={index} isGridView={isGridView} />
              ))}
            </div>
          </>
        ) :
          !loading && !dashboardLoading && allTests.length === 0 ? (
            <>
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
                      We couldn't find any {testType} materials at the moment.
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
                {/* {console.log("[TestsLibraryPage] [RENDER] State=allTests exist, filteredData.length===0", { allTests, filteredData, searchQuery, activeTab, questionType })} */}
                  <div className="flex flex-1 items-center justify-center min-h-[300px]">
                  <div className="py-20 text-center text-gray-400 font-semibold w-full whitespace-pre-line">
                    {(testType === "writing" && selectedTaskTypes.length > 0) ? (
                      `No tests found with task type${selectedTaskTypes.length > 1 ? 's' : ''}: ${selectedTaskTypes.map(type => getWritingTaskTypeDisplayName(type)).join(', ')}.`
                    ) : ((testType === "reading" || testType === "listening") && selectedQuestionTypes.length > 0) ? (
                      `No tests found with question type${selectedQuestionTypes.length > 1 ? 's' : ''}: ${selectedQuestionTypes.map(type => getQuestionTypeDisplayName(type)).join(', ')}.`
                    ) : searchQuery.trim() !== "" && emptySearchMessage ? (
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
                        ? ` grid ${cols} gap-4 md:gap-6 lg:gap-8 mb-16`
                        : "flex flex-col gap-1 mb-16"
                    }
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    key={`${activeTab}-${searchQuery}-${testType === "writing" ? selectedTaskTypes.join(',') : selectedQuestionTypes.join(',')}-${sortOrder}-${isGridView}`}
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