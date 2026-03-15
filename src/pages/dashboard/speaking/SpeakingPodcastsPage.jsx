import React from "react";
import { Link } from "react-router-dom";

const SpeakingPodcastsPage = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Podcasts</h1>
      <p className="text-gray-600 mt-2">Podcast practice will be available here soon.</p>
      <Link
        to="/speaking"
        className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← Back to Speaking
      </Link>
    </div>
  );
};

export default SpeakingPodcastsPage;
