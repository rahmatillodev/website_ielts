import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCheckCircle } from "react-icons/md";
import { formatDateToDayMonth } from "@/utils/formatDate";

/**
 * Pure presentation component for a single history item
 * Receives all data as props
 */
const MockTestHistoryItem = ({ client, results, completedAt, from = 'mockTest' }) => {
  const navigate = useNavigate();
  const resultsPath = from === 'mockTest'
    ? `/mock-test/results/${client.id}`
    : `/mock-test/results-regular/${client.id}`;

  const handleViewResults = () => {
    navigate(resultsPath);
  };
  const completedDate = completedAt 
    ? formatDateToDayMonth(completedAt)
    : formatDateToDayMonth(client.created_at);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Test Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`rounded-full p-2 ${
              client.status === 'completed'
                ? 'bg-yellow-50'
                : 'bg-green-50'
            }`}>
              <MdCheckCircle className={`text-xl ${
                client.status === 'completed'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mock Test {client.status === 'completed' ? 'Submitted' : 'Completed'}
              </h3>
              <p className="text-sm text-gray-500">
                {client.status === 'completed' ? 'Submitted' : 'Completed'} on {completedDate}
              </p>
            </div>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
              {results.listening && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Listening</p>
                  <p className="text-lg font-bold text-blue-600">
                    {results.listening.score?.toFixed(1) || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {results.listening.correct_answers || 0}/{results.listening.total_questions || 0} correct
                  </p>
                </div>
              )}
              {results.reading && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Reading</p>
                  <p className="text-lg font-bold text-green-600">
                    {results.reading.score?.toFixed(1) || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {results.reading.correct_answers || 0}/{results.reading.total_questions || 0} correct
                  </p>
                </div>
              )}
              {results.writing && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Writing</p>
                  <p className="text-lg font-bold text-purple-600">
                    {results.writing.score?.toFixed(1) || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Writed 2 Tasks and Submitted
                  </p>
                </div>
              )}
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Speaking</p>
                  <p className="text-lg font-bold text-red-600">
                    {results.speaking?.score?.toFixed(1) || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {results.speaking?.time_taken 
                      ? `${Math.floor(results.speaking?.time_taken / 60)} min` 
                      : 'Completed'}
                  </p>
                </div>
            </div>
          )}

          {/* Total Score */}
          {client.total_score !== null && client.total_score !== undefined && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Total Score:
                </span>
                <span className="text-2xl font-bold text-green-600">
                  {client.total_score.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Status Badge and Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className={`px-4 py-2 border rounded-lg ${
            client.status === 'completed' 
              ? 'bg-yellow-100 border-yellow-200'
              : 'bg-green-100 border-green-200'
          }`}>
            <span className={`text-sm font-semibold ${
              client.status === 'completed'
                ? 'text-yellow-700'
                : client.status === 'checked'
                  ? 'text-green-700'
                  : 'text-green-700'
            }`}>
              {client.status === 'completed' 
                ? 'Waiting for Review' 
                : client.status === 'checked' 
                  ? 'Evaluated' 
                  : client.status === 'notified'
                    ? 'Results Viewed'
                    : 'Completed'}
            </span>
          </div>
          {(client.status === 'checked' || client.status === 'notified') && (
            <>
              <p className="text-xs text-gray-500 text-right mb-2">
                Results available
              </p>
              <button
                onClick={handleViewResults}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                View Results
              </button>
            </>
          )}
          {client.status === 'completed' && (
            <p className="text-xs text-gray-500 text-right">
              Awaiting Instructor Review
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockTestHistoryItem;

