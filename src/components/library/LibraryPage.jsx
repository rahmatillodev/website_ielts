import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import { LuHistory, LuArrowRight } from "react-icons/lu";
import { useAuthStore } from "@/store/authStore";
import { useResponsiveGridCols } from "@/hooks/useResponsiveGridCols";
import { ShimmerBox } from "@/components/ui/shimmer";
import { getQuestionTypeDisplayName } from "@/store/testStore/utils/questionTypeUtils";
import { getWritingTaskTypeDisplayName } from "@/store/testStore/utils/writingTaskTypeUtils";
import LibraryToolbar from "./LibraryToolbar";
import LibraryCard from "./LibraryCard";

/**
 * The redesigned test library, shared by Reading, Listening, Writing and
 * Speaking. It takes the same props as the original components/TestsLibraryPage
 * minus `title`/`description`, which the redesign drops along with the hero.
 *
 * With all four swapped over, components/TestsLibraryPage has no remaining
 * callers. It is left in place rather than deleted — removing it is a separate
 * change, and CardOpen/CardLocked are still reachable from ComingSoonPage.
 *
 * The filtering, sorting, premium-gating and infinite-scroll behaviour is
 * carried over from TestsLibraryPage unchanged and deliberately so — only the
 * presentation is new. Two structural changes: the page no longer opens with a
 * hero, so the toolbar is the first thing on screen; and the list is grid-only,
 * so there is no view toggle and no persisted view preference.
 *
 * Every filter is committed through the popover's Apply. Access level used to
 * be a tab strip that applied on click, which meant two different commit models
 * on one screen; it is now temp state like everything else.
 */

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

/** Skeleton matching the card geometry, so the wait does not flash a different shape. */
const CardSkeleton = () => (
  <div className="flex h-full flex-col rounded-xl border border-gray-200/80 bg-white p-4">
    <ShimmerBox height="2.25rem" width="2.25rem" rounded="lg" className="mb-3" />
    <ShimmerBox height="1rem" width="85%" className="mb-2" />
    <ShimmerBox height="0.75rem" width="55%" className="mb-4" />
    <ShimmerBox height="0.75rem" width="70%" />
    <div className="mt-auto border-t border-gray-100 pt-4">
      <ShimmerBox height="2.25rem" width="100%" rounded="lg" />
    </div>
  </div>
);

const LibraryPage = ({
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
  const [activeTab, setActiveTab] = useState("All Tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState([]);
  const [selectedPartLabels, setSelectedPartLabels] = useState([]);
  const [selectedWritingTaskLabels, setSelectedWritingTaskLabels] = useState([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [sortOrder, setSortOrder] = useState("oldest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempAccess, setTempAccess] = useState("All Tests");
  const [tempSelectedTypes, setTempSelectedTypes] = useState([]);
  const [tempSelectedPartLabels, setTempSelectedPartLabels] = useState([]);
  const [tempSelectedWritingTaskLabels, setTempSelectedWritingTaskLabels] = useState([]);
  const [tempSelectedDifficulties, setTempSelectedDifficulties] = useState([]);
  const [tempSortOrder, setTempSortOrder] = useState("oldest");
  const [displayedItems, setDisplayedItems] = useState(12);

  const itemsPerLoad = 12;
  const scrollContainerRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const userProfile = useAuthStore((state) => state.userProfile);
  const location = useLocation();
  const navigate = useNavigate();
  const cols = useResponsiveGridCols();
  const reduceMotion = useReducedMotion();

  const allTests = Array.isArray(testData) ? testData : [];

  useEffect(() => {
    if (!fetchTests) return;
    if (!hasFetchedRef.current && !loading) {
      hasFetchedRef.current = true;
      fetchTests(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, fetchTests]);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [location.pathname]);

  const fullPartLabel =
    testType === "reading" ? "Full reading" : testType === "listening" ? "Full listening" : "Full speaking";

  const filteredData = useMemo(() => {
    if (!Array.isArray(allTests) || allTests.length === 0) return [];

    const filtered = allTests.filter((test) => {
      if (!test || typeof test !== "object") return false;

      const matchesSearch = test.title
        ? test.title.toLowerCase().includes(searchQuery.toLowerCase())
        : false;

      const matchesTab =
        activeTab === "All Tests" ||
        (activeTab === "premium" && test.is_premium === true) ||
        (activeTab === "free" && test.is_premium === false);

      const matchesDifficulty =
        selectedDifficulties.length === 0 ||
        selectedDifficulties.includes(String(test.difficulty || "").toLowerCase());

      const matchesPart =
        selectedPartLabels.length === 0 ||
        selectedPartLabels.some((sel) => {
          if (sel === fullPartLabel) return test.partLabel === fullPartLabel;
          if (sel.startsWith("Part ")) {
            const n = parseInt(sel.slice(5), 10);
            if (!Number.isFinite(n)) return false;
            if (Array.isArray(test.partNumbers) && test.partNumbers.length > 0) {
              return test.partNumbers.includes(n);
            }
            return test.partLabel === sel;
          }
          return test.partLabel === sel;
        });

      const matchesWritingTask =
        testType !== "writing" ||
        selectedWritingTaskLabels.length === 0 ||
        (test.taskLabel && selectedWritingTaskLabels.includes(test.taskLabel));

      let matchesType = true;
      if (testType === "writing") {
        matchesType =
          selectedTaskTypes.length === 0 ||
          (test.task_types &&
            ((test.task_types instanceof Set && selectedTaskTypes.some((t) => test.task_types.has(t))) ||
              (Array.isArray(test.task_types) && selectedTaskTypes.some((t) => test.task_types.includes(t)))));
      } else if (testType === "speaking") {
        matchesType = true;
      } else {
        matchesType =
          selectedQuestionTypes.length === 0 ||
          (test.question_types &&
            ((test.question_types instanceof Set && selectedQuestionTypes.some((t) => test.question_types.has(t))) ||
              (Array.isArray(test.question_types) && selectedQuestionTypes.some((t) => test.question_types.includes(t)))));
      }

      return matchesSearch && matchesTab && matchesDifficulty && matchesPart && matchesWritingTask && matchesType;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [allTests, searchQuery, activeTab, selectedDifficulties, selectedPartLabels, selectedWritingTaskLabels, selectedQuestionTypes, selectedTaskTypes, sortOrder, testType, fullPartLabel]);

  const currentItems = useMemo(() => filteredData.slice(0, displayedItems), [filteredData, displayedItems]);
  const hasMoreItems = displayedItems < filteredData.length;

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMoreRef.current) return;
    if (displayedItems >= filteredData.length) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      isLoadingMoreRef.current = true;
      setDisplayedItems((prev) => {
        const next = Math.min(prev + itemsPerLoad, filteredData.length);
        setTimeout(() => { isLoadingMoreRef.current = false; }, 300);
        return next;
      });
    }
  }, [displayedItems, filteredData.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    setDisplayedItems(12);
    isLoadingMoreRef.current = false;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [activeTab, searchQuery, selectedDifficulties, selectedPartLabels, selectedWritingTaskLabels, selectedQuestionTypes, selectedTaskTypes, sortOrder]);

  // If the first page does not fill the viewport, keep pulling until it does.
  useEffect(() => {
    if (loading || dashboardLoading || filteredData.length === 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let checkCount = 0;
    const checkAndLoadMore = () => {
      if (isLoadingMoreRef.current || checkCount >= 10) return;
      checkCount++;
      requestAnimationFrame(() => {
        const { scrollHeight, clientHeight } = container;
        setDisplayedItems((prev) => {
          if (scrollHeight <= clientHeight && prev < filteredData.length) {
            isLoadingMoreRef.current = true;
            const next = Math.min(prev + itemsPerLoad, filteredData.length);
            setTimeout(() => {
              isLoadingMoreRef.current = false;
              setTimeout(checkAndLoadMore, 200);
            }, 300);
            return next;
          }
          return prev;
        });
      });
    };

    const timeoutId = setTimeout(checkAndLoadMore, 300);
    return () => clearTimeout(timeoutId);
  }, [filteredData.length, loading, dashboardLoading]);

  /* ---------- filter plumbing ---------- */

  const availableDifficulties = useMemo(() => {
    if (!Array.isArray(allTests)) return [];
    const found = new Set();
    for (const t of allTests) {
      const d = String(t?.difficulty || "").toLowerCase();
      if (DIFFICULTY_ORDER.includes(d)) found.add(d);
    }
    return DIFFICULTY_ORDER.filter((d) => found.has(d));
  }, [allTests]);

  const availablePartLabels = useMemo(() => {
    if (testType === "writing" || !Array.isArray(allTests)) return [];
    const labels = new Set();
    for (const t of allTests) {
      if (t.partLabel === fullPartLabel) labels.add(fullPartLabel);
      if (Array.isArray(t.partNumbers)) for (const n of t.partNumbers) labels.add(`Part ${n}`);
    }
    return [...labels].sort((a, b) => {
      if (a === fullPartLabel) return 1;
      if (b === fullPartLabel) return -1;
      return parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10);
    });
  }, [allTests, testType, fullPartLabel]);

  const WRITING_TASK_LABELS = ["Task 1", "Task 2", "Both"];
  const availableWritingTaskLabels = useMemo(() => {
    if (testType !== "writing" || !Array.isArray(allTests)) return [];
    const labels = allTests.map((t) => t.taskLabel).filter(Boolean);
    return [...new Set(labels)].sort(
      (a, b) => WRITING_TASK_LABELS.indexOf(a) - WRITING_TASK_LABELS.indexOf(b)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTests, testType]);

  const seedTempState = () => {
    setTempAccess(activeTab);
    setTempSelectedTypes(
      testType === "writing" ? [...selectedTaskTypes] : testType !== "speaking" ? [...selectedQuestionTypes] : []
    );
    setTempSelectedPartLabels([...selectedPartLabels]);
    setTempSelectedWritingTaskLabels([...selectedWritingTaskLabels]);
    setTempSelectedDifficulties([...selectedDifficulties]);
    setTempSortOrder(sortOrder);
  };

  const handleFilterApply = () => {
    setActiveTab(tempAccess);
    if (testType === "writing") setSelectedTaskTypes([...tempSelectedTypes]);
    else if (testType !== "speaking") setSelectedQuestionTypes([...tempSelectedTypes]);
    setSelectedPartLabels([...tempSelectedPartLabels]);
    setSelectedWritingTaskLabels([...tempSelectedWritingTaskLabels]);
    setSelectedDifficulties([...tempSelectedDifficulties]);
    setSortOrder(tempSortOrder);
    setFilterOpen(false);
  };

  const handleFilterClear = () => {
    setTempAccess("All Tests");
    setTempSelectedTypes([]);
    setTempSelectedPartLabels([]);
    setTempSelectedWritingTaskLabels([]);
    setTempSelectedDifficulties([]);
    setTempSortOrder("oldest");
    setActiveTab("All Tests");
    setSelectedPartLabels([]);
    setSelectedWritingTaskLabels([]);
    setSelectedQuestionTypes([]);
    setSelectedTaskTypes([]);
    setSelectedDifficulties([]);
    setSortOrder("oldest");
    setSearchQuery("");
    setFilterOpen(false);
  };

  const toggleInList = (setter) => (value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const activeFilterCount =
    selectedPartLabels.length +
    selectedDifficulties.length +
    (activeTab !== "All Tests" ? 1 : 0) +
    (testType === "writing"
      ? selectedTaskTypes.length + selectedWritingTaskLabels.length
      : testType === "speaking"
        ? 0
        : selectedQuestionTypes.length) +
    (sortOrder !== "oldest" ? 1 : 0);

  /* ---------- empty copy ---------- */

  const emptyFilteredMessage = () => {
    if (testType === "writing" && selectedTaskTypes.length > 0)
      return `No tests with task type${selectedTaskTypes.length > 1 ? "s" : ""}: ${selectedTaskTypes.map(getWritingTaskTypeDisplayName).join(", ")}.`;
    if (testType === "writing" && selectedWritingTaskLabels.length > 0)
      return `No tests for: ${selectedWritingTaskLabels.join(", ")}.`;
    if ((testType === "reading" || testType === "listening") && selectedQuestionTypes.length > 0)
      return `No tests with question type${selectedQuestionTypes.length > 1 ? "s" : ""}: ${selectedQuestionTypes.map(getQuestionTypeDisplayName).join(", ")}.`;
    if (selectedPartLabels.length > 0) return `No tests for: ${selectedPartLabels.join(", ")}.`;
    if (selectedDifficulties.length > 0) return `No ${selectedDifficulties.join(" or ")} tests.`;
    if (searchQuery.trim() && emptySearchMessage) return emptySearchMessage;
    if (activeTab === "free" && emptyFreeMessage) return emptyFreeMessage;
    if (activeTab === "premium" && emptyPremiumMessage) return emptyPremiumMessage;
    if (searchQuery.trim()) return `No results for "${searchQuery.trim()}".`;
    if (activeTab === "free") return "No free tests available.";
    if (activeTab === "premium") return "No premium tests available.";
    return "No results found.";
  };

  const isBusy = (loading || dashboardLoading) && allTests.length === 0;
  const isEmptyLibrary = !loading && !dashboardLoading && allTests.length === 0;
  const isEmptyFiltered = allTests.length > 0 && filteredData.length === 0;

  const gridWrapper = `grid ${cols} gap-3 md:gap-4`;

  return (
    <div className={`mx-auto flex flex-col bg-white ${customHeight} overflow-hidden`}>
      {(testType === "speaking" || testType === "shadowing" || testType === "podcast") && (
        <div className="px-3 pt-4 md:px-8">
          <button
            type="button"
            onClick={() => navigate("/speaking")}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <FaArrowLeft className="size-3" aria-hidden="true" />
            Back to Speaking
          </button>
        </div>
      )}

      <LibraryToolbar
        testType={testType}
        searchQuery={searchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        availablePartLabels={availablePartLabels}
        availableWritingTaskLabels={availableWritingTaskLabels}
        availableDifficulties={availableDifficulties}
        resultCount={filteredData.length}
        hasActiveFilters={activeFilterCount > 0 || Boolean(searchQuery)}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        onFilterOpen={seedTempState}
        onFilterApply={handleFilterApply}
        onFilterClear={handleFilterClear}
        tempAccess={tempAccess}
        onAccessChange={setTempAccess}
        tempSelectedDifficulties={tempSelectedDifficulties}
        onToggleDifficulty={toggleInList(setTempSelectedDifficulties)}
        tempSelectedTypes={tempSelectedTypes}
        onToggleType={toggleInList(setTempSelectedTypes)}
        tempSelectedPartLabels={tempSelectedPartLabels}
        onToggleTempPart={toggleInList(setTempSelectedPartLabels)}
        tempSelectedWritingTaskLabels={tempSelectedWritingTaskLabels}
        onToggleTempWritingTask={toggleInList(setTempSelectedWritingTaskLabels)}
        tempSortOrder={tempSortOrder}
        onSortChange={setTempSortOrder}
        activeFilterCount={activeFilterCount}
      />

      {/* Writing's two page-level links. They sit below the toolbar rather than
          inside it so the control row stays identical across all four types;
          nothing else in the app links to these two routes. */}
      {testType === "writing" && (
        <div className="flex items-center gap-2 px-3 pt-4 md:px-8">
          <Link
            to="/writing/writing-history"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <LuHistory className="size-4" aria-hidden="true" />
            History
          </Link>
          {headerAction && (
            <Link
              to={headerAction}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {headerActionText}
              <LuArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 pb-16 pt-4 md:px-8">
        {isBusy ? (
          <div className={gridWrapper}>
            {Array.from({ length: 9 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isEmptyLibrary ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center">
            <div className="max-w-sm text-center">
              <p className="whitespace-pre-line text-[15px] font-medium text-gray-900">
                {emptyStateMessage || `No ${testType} tests yet`}
              </p>
              {!emptyStateMessage && (
                <p className="mt-1.5 text-[13px] text-gray-500">
                  New material is added regularly — check back soon.
                </p>
              )}
            </div>
          </div>
        ) : isEmptyFiltered ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center">
            <div className="max-w-sm text-center">
              <p className="whitespace-pre-line text-[15px] font-medium text-gray-900">
                {emptyFilteredMessage()}
              </p>
              <button
                onClick={handleFilterClear}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : currentItems.length > 0 ? (
          <>
            <motion.div
              className={gridWrapper}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.03 } },
              }}
              key={activeTab}
            >
              {currentItems.map((test) => {
                const subscriptionStatus = userProfile?.subscription_status ?? "free";
                const canAccess = subscriptionStatus === "premium" || !test.is_premium;
                return (
                  <motion.div
                    key={test.id}
                    className="h-full"
                    variants={{
                      hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
                    }}
                  >
                    <LibraryCard
                      {...test}
                      video_id={test.video_id || test.id}
                      partLabel={test.partLabel ?? test.taskLabel}
                      testType={testType}
                      locked={!canAccess}
                    />
                  </motion.div>
                );
              })}
            </motion.div>

            {hasMoreItems && (
              <p className="py-8 text-center text-[13px] text-gray-400">Loading more…</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default LibraryPage;
