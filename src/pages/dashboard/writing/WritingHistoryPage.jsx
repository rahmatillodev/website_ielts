import { Button } from '@/components/ui/button'
import { useWritingCompletedStore } from '@/store/WritingCompletedStore';
import React, { useEffect, useState, useMemo } from 'react'
import { FaArrowLeft, FaClock, FaFileAlt, FaArrowRight, FaHistory, FaSearch, FaArrowUp, FaArrowDown  } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ComplatedCard from '@/components/cards/ComplatedCard';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { IoListOutline, IoGridOutline } from "react-icons/io5";

const WritingHistoryPage = () => {
  const navigate = useNavigate();
  const { getWritingAttempts, loading } = useWritingCompletedStore();
  const { writingId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Tests");
  const [isGridView, setIsGridView] = useState(true);
  const [isAscending, setIsAscending] = useState(true);

  const handleGridViewChange = (value) => {
    setIsGridView(value === "grid");
  };

  // Fetch writing attempts
  useEffect(() => {
    const fetchAttempts = async () => {
      setIsLoading(true);
      try {
        const data = await getWritingAttempts();
        setAttempts(data || []);
      } catch (error) {
        console.error('Error fetching writing attempts:', error);
        toast.error('Failed to load writing history');
        setAttempts([]);
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
  
  
  const filteredData = useMemo(() => {
    let sortedAttempts = [...attempts];
    if (isAscending) {
      sortedAttempts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      sortedAttempts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (!Array.isArray(sortedAttempts) || sortedAttempts.length === 0) {
      // console.log("[TestsLibraryPage] filteredData computes [] because allTests is falsy or empty", { allTests });
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

      return matchesSearch && matchesTab;
    });
    // console.log("[TestsLibraryPage] filteredData calculation", { filtered, searchQuery, activeTab, allTestsLength: allTests.length });
    return filtered;
  }, [attempts, searchQuery, activeTab, isAscending]);

  const handleSortChange = (value) => {
    setIsAscending(value === "asc");
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
              {/* filter by ascending and descending */}
              <ToggleGroup
                type="single"
                value={isAscending ? "asc" : "desc"}
                onValueChange={handleSortChange}
                className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200 shrink-0 gap-1"
              >
                <ToggleGroupItem value="asc" aria-label="Ascending" className="flex items-center justify-center p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 
               data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm
               data-[state=off]:text-gray-400 hover:text-gray-600
               [&:not(:first-child)]:rounded-lg [&:not(:last-child)]:rounded-lg"
                >
                  <FaArrowUp className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="desc" aria-label="Descending" className="flex items-center justify-center p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 
               data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm
               data-[state=off]:text-gray-400 hover:text-gray-600
               [&:not(:first-child)]:rounded-lg [&:not(:last-child)]:rounded-lg"
                >
                  <FaArrowDown className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
           

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
          <p className="text-lg font-medium">No writing attempts yet</p>
          <p className="text-sm mt-2">Complete a writing test to see your history here</p>
        </div>
      ) : (
        <div className={isGridView 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" 
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