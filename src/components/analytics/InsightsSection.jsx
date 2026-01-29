import React, { useState, useMemo } from 'react';
import { FaThumbsUp, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
const INSIGHT_TIPS = {
  reading: {
    matching: {
      strong: "Excellent at identifying main ideas and connecting paragraph themes.",
      weak: "Try to focus on the first and last sentences of paragraphs to find the 'gist' faster."
    },
    true_false_not_given: {
      strong: "You have a sharp eye for factual consistency and identifying author claims.",
      weak: "Remember: 'False' means the text says the opposite, 'Not Given' means the info is missing."
    },
    multiple_choice: {
      strong: "Great job at eliminating distractors and finding specific evidence.",
      weak: "Don't pick an answer just because it contains words from the text; look for paraphrases."
    },
    summary: {
      strong: "Strong command of context clues and grammatical fit in gap-fill tasks.",
      weak: "Always check the 'Word Limit' and ensure the part of speech (noun/verb) fits the gap."
    },
    yes_no_not_given: {
      strong: "You're skilled at interpreting the writer's opinions and attitudes.",
      weak: "Be careful not to bring in your own knowledge; only use what the writer explicitly states."
    },
    map: {
      strong: "Excellent spatial awareness and ability to follow directional language.",
      weak: "Visualize yourself at the 'You are here' point and follow the left/right turns carefully."
    },
    table_completion: {
      strong: "High level of accuracy in extracting specific data under time pressure.",
      weak: "Work on your shorthand and spelling; even a small typo results in zero points."
    }
  },
  listening: {
    multiple_choice: {
      strong: "Superb at following the speaker's line of reasoning even when they change their mind.",
      weak: "Listen for 'signposting' words like 'however' or 'actually' which often signal the correct answer."
    },
    table_completion: {
      strong: "High level of accuracy in extracting specific data under time pressure.",
      weak: "Work on your shorthand and spelling; even a small typo results in zero points."
    },
    map: {
      strong: "Excellent spatial awareness and ability to follow directional language.",
      weak: "Visualize yourself at the 'You are here' point and follow the left/right turns carefully."
    }, 
    summary: {
      strong: "Strong command of context clues and grammatical fit in gap-fill tasks.",
      weak: "Always check the 'Word Limit' and ensure the part of speech (noun/verb) fits the gap."
    },
    true_false_not_given: {
      strong: "You have a sharp eye for factual consistency and identifying author claims.",
      weak: "Remember: 'False' means the text says the opposite, 'Not Given' means the info is missing."
    },
    yes_no_not_given: {
      strong: "You're skilled at interpreting the writer's opinions and attitudes.",
      weak: "Be careful not to bring in your own knowledge; only use what the writer explicitly states."
    },
    matching: {
      strong: "Excellent at identifying main ideas and connecting paragraph themes.",
      weak: "Try to focus on the first and last sentences of paragraphs to find the 'gist' faster."
    }
  }
};
const InsightsSection = ({ insights }) => {
  const [filter, setFilter] = useState('both');

  const displayInsights = useMemo(() => {
    if (!insights?.allInsights) return [];

    // 1. Avval tanlangan filtr bo'yicha ma'lumotlarni ajratib olamiz
    const pool = insights.allInsights.filter(item =>
      filter === 'both' ? true : item.category.toLowerCase() === filter
    );

    if (pool.length === 0) return [];

    // 2. Accuracy bo'yicha tartiblaymiz
    const sorted = [...pool].sort((a, b) => b.accuracy - a.accuracy);

    // 3. Agar ma'lumot yetarli bo'lsa, eng yaxshi va eng yomonini olamiz
    const result = [];
    if (sorted.length > 0) result.push(sorted[0]); // Best
    if (sorted.length > 1) result.push(sorted[sorted.length - 1]); // Worst

    return result;
  }, [insights, filter]);

  if (!insights || !insights.allInsights) {
    return (
      <div className="bg-white rounded-xl p-6 text-center h-[400px] flex flex-col justify-center border border-dashed border-gray-200">
        <div className="text-gray-300 text-5xl mb-4">📊</div>
        <p className="text-gray-500 font-medium">No insights available yet.</p>
      </div>
    );
  }

  const getTip = (item) => {
    const category = item.category.toLowerCase(); // 'reading' or 'listening'
    const type = item.type; // This should match the keys in INSIGHT_TIPS above
    const isStrong = item.accuracy >= 70;

    // Try to find a specific tip
    const specificTip = INSIGHT_TIPS[category]?.[type];

    if (specificTip) {
      return isStrong ? specificTip.strong : specificTip.weak;
    }

    // Fallback for types not explicitly mapped (like 'other')
    return isStrong
      ? "Your performance is solid. Keep practicing to maintain this level."
      : "Consistent practice and reviewing your mistakes will help improve this area.";
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FaChartLine className="text-indigo-600" /> Key Insights
        </h3>

        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 w-[240px]">
            <TabsTrigger value="both">Both</TabsTrigger>
            <TabsTrigger value="reading">Reading</TabsTrigger>
            <TabsTrigger value="listening">Listening</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Insight Cards */}
      <div className="space-y-4">
        {displayInsights.length > 0 ? (
          displayInsights.map((item, idx) => {
            const isBest = idx === 0 && displayInsights.length > 1;
            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all duration-300 ${item.accuracy >= 70
                    ? 'bg-gradient-to-r from-green-50 to-white border-green-200 shadow-sm'
                    : 'bg-gradient-to-r from-orange-50 to-white border-orange-200 shadow-sm'
                  }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.accuracy >= 70 ? 'bg-green-500' : 'bg-orange-500'} text-white text-sm`}>
                      {item.accuracy >= 70 ? <FaThumbsUp /> : <FaExclamationTriangle />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${item.category === 'Reading' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                          {item.category}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {item.accuracy >= 70 ? 'Top Strength' : 'Needs Focus'}
                        </span>
                      </div>
                      <h4 className="text-md font-bold text-gray-900 mt-1">{item.displayType}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-black ${item.accuracy >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                      {item.accuracy.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed bg-white/50 p-3 rounded-xl border border-gray-100 italic">
                  "{getTip(item)}"
                </p>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400">Complete more tests to generate insights</p>
          </div>
        )}
      </div>

      {/* <p className="text-[11px] text-gray-400 text-center">
        Showing your most significant performance metrics for the selected category.
      </p> */}
    </div>
  );
};

export default InsightsSection;