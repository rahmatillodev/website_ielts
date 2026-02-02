import { Button } from '@/components/ui/button'
import { useWritingCompletedStore } from '@/store/WritingCompletedStore';
import React, { useEffect, useState, useCallback } from 'react'
import { FaArrowLeft, FaClock, FaFileAlt } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const WritingHistoryPage = () => {
  const navigate = useNavigate();
  const { getWritingAttempts, loading } = useWritingCompletedStore();
  const { writingId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Format time from seconds
  const formatTime = useCallback((seconds) => {
    if (!seconds || seconds < 0) return "0m 0s";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  }, []);

  // Format date from timestamp
  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

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

  return (
    <div className="flex flex-col mx-auto bg-gray-50 h-[calc(100vh-64px)] overflow-y-auto p-4 md:p-10">
      <Button 
        variant="outline" 
        className="bg-gray-50 pt-4 pb-2 md:pb-4 shrink-0 sticky top-0 z-10 w-fit mb-4" 
        onClick={() => navigate("/writing")}
      >
        <FaArrowLeft className="w-4 h-4" />
        Back to Writing Library
      </Button>
      
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Writing History</h1>

      {isLoading || loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-gray-500">Loading writing history...</div>
        </div>
      ) : attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <FaFileAlt className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">No writing attempts yet</p>
          <p className="text-sm mt-2">Complete a writing test to see your history here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => {
            const writing = attempt.writings;
            const writingTitle = writing?.title || 'Unknown Writing';
            const difficulty = writing?.difficulty || 'N/A';
            
            return (
              <div
                key={attempt.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 md:p-6 border border-gray-200"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                      {writingTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaClock className="w-4 h-4" />
                        <span>{formatTime(attempt.time_taken)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {difficulty}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        {formatDate(attempt.completed_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/writing-practice/${attempt.writing_id}?mode=review&attemptId=${attempt.id}`)}
                      className="shrink-0"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default WritingHistoryPage