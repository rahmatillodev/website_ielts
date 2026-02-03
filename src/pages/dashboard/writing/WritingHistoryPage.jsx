import { Button } from '@/components/ui/button'
import { useWritingCompletedStore } from '@/store/WritingCompletedStore';
import React, { useEffect, useState, useMemo } from 'react'
import { FaArrowLeft, FaClock, FaFileAlt, FaArrowRight, FaHistory, FaSearch  } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ComplatedCard from '@/components/cards/ComplatedCard';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";

const WritingHistoryPage = () => {
  const navigate = useNavigate();
  const { getWritingAttempts, loading } = useWritingCompletedStore();
  const { writingId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Tests");

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
    if (!Array.isArray(attempts) || attempts.length === 0) {
      // console.log("[TestsLibraryPage] filteredData computes [] because allTests is falsy or empty", { allTests });
      return [];
    }
    const filtered = attempts.filter((test) => {
      // Safety check: ensure test exists and has required properties
      if (!test || typeof test !== 'object') {
        return false;
      }

      const matchesSearch = test.writings.title
        ? test.writings.title.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
        
        const matchesTab =
        activeTab === "All Tests" ||
        (activeTab === "premium" && test.writings.is_premium === true) ||  
        (activeTab === "free" && test.writings.is_premium === false);

      return matchesSearch && matchesTab;
    });
    // console.log("[TestsLibraryPage] filteredData calculation", { filtered, searchQuery, activeTab, allTestsLength: allTests.length });
    return filtered;
  }, [attempts, searchQuery, activeTab]);
  
  console.log(attempts[0]);
  return (
    <div className="flex flex-col mx-auto bg-gray-50 h-[calc(100vh-64px)] overflow-y-auto px-4 py-0 md:p-10">
      <div className="flex align-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Writing History</h1>
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
        <div className="space-y-4">
          {filteredData.map((attempt) => {
            const writing = attempt.writings;
            const writingTitle = writing?.title || 'Unknown Writing';
            const difficulty = writing?.difficulty || 'N/A';
            
            return (
              <div
                key={attempt.id}
              >
                <ComplatedCard
                  id={attempt.writings.id}
                  title={writingTitle}
                  difficulty={difficulty}
                  duration={attempt.time_taken}
                  question_quantity={attempt.total_questions}
                  isCompleted={true}
                  is_premium={attempt.writings.is_premium}
                  created_at={attempt.created_at}
                  completed_at={attempt.completed_at}
                  testType='writing'
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