import { Button } from '@/components/ui/button'
import React, { useEffect, useState, useMemo } from 'react'
import { FaArrowLeft, FaClock, FaFileAlt, FaArrowRight, FaHistory, FaSearch, FaArrowUp, FaArrowDown  } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ComplatedCard from '@/components/cards/ComplatedCard';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { IoListOutline, IoGridOutline } from "react-icons/io5";
import { useResponsiveGridCols } from '@/hooks/useResponsiveGridCols';
import { WRITING_TASK_TYPES, getWritingTaskTypeDisplayName } from "@/store/testStore/utils/writingTaskTypeUtils";
import { useWritingTaskTypeStore } from "@/store/testStore/writingTaskTypeStore";
import { CiFilter } from "react-icons/ci";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useWritingCompletedStore } from '@/store/writingCompletedStore';

const WritingHistoryPage = () => {
  const navigate = useNavigate();
  const { getWritingAttempts, loading } = useWritingCompletedStore();
  const { writingId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [enrichedAttempts, setEnrichedAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Tests");
  const [isGridView, setIsGridView] = useState(true);
  const [sortOrder, setSortOrder] = useState("newest"); // Sort by newest/oldest
  const [selectedTaskTypes, setSelectedTaskTypes] = useState([]); // Multi-select task types
  const [filterOpen, setFilterOpen] = useState(false); // Control filter popover
  const [tempSelectedTypes, setTempSelectedTypes] = useState([]); // Temporary state for filter panel
  const [tempSortOrder, setTempSortOrder] = useState("newest"); // Temporary sort state

  const handleGridViewChange = (value) => {
    setIsGridView(value === "grid");
  };

  // Fetch writing attempts and enrich with task types
  useEffect(() => {
    const fetchAttempts = async () => {
      setIsLoading(true);
      try {
        const data = await getWritingAttempts();
        setAttempts(data || []);
        
        // Fetch task types for all writings
        const writingIds = (data || [])
          .map(attempt => attempt.writings?.id)
          .filter(id => id);
        
        if (writingIds.length > 0) {
          try {
            const taskTypesMap = await useWritingTaskTypeStore.getState().fetchTaskTypesForWritings(writingIds);
            
            // Enrich attempts with task types
            const enriched = (data || []).map(attempt => ({
              ...attempt,
              writings: attempt.writings ? {
                ...attempt.writings,
                task_types: taskTypesMap[attempt.writings.id] || new Set(),
              } : attempt.writings,
            }));
            
            setEnrichedAttempts(enriched);
          } catch (error) {
            console.warn('[WritingHistoryPage] Error fetching task types, continuing without them:', error);
            setEnrichedAttempts(data || []);
          }
        } else {
          setEnrichedAttempts(data || []);
        }
      } catch (error) {
        console.error('Error fetching writing attempts:', error);
        toast.error('Failed to load writing history');
        setAttempts([]);
        setEnrichedAttempts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [getWritingAttempts]);
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // console.log("[TestsLibraryPage] Changed searchQuery", e.target.value);
  };
  
  const handleFilterChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      // console.log("[TestsLibraryPage] Changed activeTab", tab);
    }
  };
  const cols = useResponsiveGridCols();

  
  
  const filteredData = useMemo(() => {
    let sortedAttempts = [...enrichedAttempts];
    
    // Sort by created_at
    sortedAttempts.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    if (!Array.isArray(sortedAttempts) || sortedAttempts.length === 0) {
      return [];
    }
    
    const filtered = sortedAttempts.filter((test) => {
      // Safety check: ensure test exists and has required properties
      if (!test || typeof test !== 'object') {
        return false;
      }

      // Handle both regular writings and own writings
      const writings = test.writings || {};
      const title = writings.title || '';
      
      const matchesSearch = title
        ? title.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
        
      const matchesTab =
        activeTab === "All Tests" ||
        (activeTab === "premium" && writings.is_premium === true) ||  
        (activeTab === "free" && (writings.is_premium === false || writings.is_premium === undefined));

      // Filter by task type (multi-select)
      const matchesTaskType = selectedTaskTypes.length === 0 ||
        (writings.task_types && (
          (writings.task_types instanceof Set && selectedTaskTypes.some(type => writings.task_types.has(type))) ||
          (Array.isArray(writings.task_types) && selectedTaskTypes.some(type => writings.task_types.includes(type)))
        ));

      return matchesSearch && matchesTab && matchesTaskType;
    });
    
    return filtered;
  }, [enrichedAttempts, searchQuery, activeTab, selectedTaskTypes, sortOrder]);

  // Filter panel handlers
  const handleFilterOpen = () => {
    setTempSelectedTypes([...selectedTaskTypes]);
    setTempSortOrder(sortOrder);
    setFilterOpen(true);
  };

  const handleFilterCancel = () => {
    setTempSelectedTypes([...selectedTaskTypes]);
    setTempSortOrder(sortOrder);
    setFilterOpen(false);
  };

  const handleFilterClear = () => {
    /// close modal and reset the state
    setFilterOpen(false);
    setTempSelectedTypes([]);
    setTempSortOrder("newest");
  };

  const handleFilterSearch = () => {
    setSelectedTaskTypes([...tempSelectedTypes]);
    setSortOrder(tempSortOrder);
    setFilterOpen(false);
  };

  const toggleTaskType = (type) => {
    setTempSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  
  return (
    <div className="flex flex-col mx-auto bg-gray-50 h-[calc(100vh-64px)] overflow-y-auto px-4 py-0 md:p-10">
      <div className="flex align-center justify-between">
        <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Writing History</h1>
        <p>
          View your writing history and track your progress.
        </p>
        </div>
          <Button 
            variant="outline" 
            className="bg-gray-50 pt-4 pb-2 md:pb-4 shrink-0 w-fit mb-4" 
            onClick={() => navigate("/writing")}
          >
            <FaArrowLeft className="w-4 h-4" />
            Back to Writing Library
          </Button>
      </div>
      <header className="flex-col justify-between items-center pb-10">
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
              {/* Filter by task types */}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <button
                    onClick={handleFilterOpen}
                    className="relative rounded-2xl bg-white border-2 border-gray-300 text-base focus:ring-2 focus:ring-blue-500 transition-all flex items-center justify-center hover:bg-gray-50 hover:border-blue-400 hover:shadow-lg"
                    style={{
                      width: "48px",
                      height: "48px",
                    }}
                  >
                    <CiFilter className="w-6 h-6" />
                    {selectedTaskTypes.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md">
                        {selectedTaskTypes.length}
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
                  {/* Task Types Section */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Task Types</h3>
                      <Button
                        onClick={handleFilterClear}
                        variant="ghost"
                        className="text-sm text-gray-600 hover:text-gray-900 p-0 h-auto border-none hover:bg-transparent"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="">
                      {WRITING_TASK_TYPES.map((type) => {
                        const isChecked = tempSelectedTypes.includes(type);
                        return (
                          <label
                            key={type}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleTaskType(type)}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer accent-blue-600"
                            />
                            <span className="text-sm text-gray-700 font-medium">
                              {getWritingTaskTypeDisplayName(type)}
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
             {/* grid view and list view */}
             <ToggleGroup
                type="single"
                value={isGridView ? "grid" : "list"}
                onValueChange={handleGridViewChange}
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
      </header>

      {isLoading || loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-gray-500">Loading writing history...</div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <FaFileAlt className="w-16 h-16 mb-4 text-gray-300" />
          {selectedTaskTypes.length > 0 ? (
            <p className="text-lg font-medium">
              No writing attempts found with task type{selectedTaskTypes.length > 1 ? 's' : ''}: {selectedTaskTypes.map(type => getWritingTaskTypeDisplayName(type)).join(', ')}.
            </p>
          ) : searchQuery.trim() !== "" ? (
            <p className="text-lg font-medium">No results match your search.</p>
          ) : (
            <>
              <p className="text-lg font-medium">No writing attempts yet</p>
              <p className="text-sm mt-2">Complete a writing test to see your history here</p>
            </>
          )}
        </div>
      ) : (
        <div className={isGridView 
          ? `grid ${cols} gap-4 md:gap-6`
          : "space-y-4"
        }>
          {filteredData.map((attempt) => {
            const writing = attempt.writings;
            const writingTitle = writing?.title || 'Unknown Writing';
            const difficulty = writing?.difficulty || 'N/A';
            const writingId = writing?.id;
            
            return (
              <div
                key={attempt.id}
              >
                <ComplatedCard
                  id={writingId}
                  attemptId={attempt.id}
                  title={writingTitle}
                  difficulty={difficulty}
                  duration={attempt.time_taken}
                  question_quantity={attempt.total_questions}
                  isCompleted={true}
                  is_premium={attempt.writings?.is_premium || false}
                  created_at={attempt.created_at}
                  completed_at={attempt.completed_at}
                  testType='writing'
                  isGridView={isGridView}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default WritingHistoryPage