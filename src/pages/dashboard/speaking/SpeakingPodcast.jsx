import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { formatPublishedDate } from "@/utils/formatDate";
import { isPremiumSubscriber } from "@/utils/isPremiumSubscriber";
import { fetchMediaLibraryRows, mapMediaLibraryRow } from "@/lib/speakingLibrary";
import { useMediaDurations } from "@/hooks/useMediaDurations";
import SpeakingPodcastCard from "./SpeakingPodcastCard";

const SpeakingPodcast = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const fetchUserProfile = useAuthStore((state) => state.fetchUserProfile);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  const isProMember = isPremiumSubscriber(userProfile);

  const loadPodcasts = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    const { data, error } = await fetchMediaLibraryRows("podcast");

    if (error) {
      setFetchError(error.message || "Could not load podcasts.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(data.map((item) => mapMediaLibraryRow(item, formatPublishedDate)));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authUser?.id) {
      fetchUserProfile(authUser.id, false);
      fetchDashboardData(authUser.id, false);
    }
  }, [authUser?.id, fetchUserProfile, fetchDashboardData]);

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

  // Measured against the full list, not the filtered one, so typing in the search
  // box never re-probes a video that has already been measured.
  const durations = useMediaDurations(rows);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => item.title?.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  return (
    <div className="flex flex-col mx-auto bg-gray-50 h-[calc(100vh-64px)] overflow-hidden px-3 md:px-8">
      <div className="shrink-0 bg-gray-50 pt-2 pb-2 md:pb-4">
        <button
          type="button"
          onClick={() => navigate("/speaking")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium mb-3 md:mb-4 w-fit"
        >
          <FaArrowLeft className="w-4 h-4" aria-hidden />
          Back to Speaking
        </button>

        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 md:gap-6">
          <div className="flex flex-col gap-2 md:gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Speaking Podcast</h1>
            <p className="text-sm md:text-base text-gray-500 font-medium tracking-tight w-full lg:w-8/12">
              Listen to expert advice and model answers to improve your skills.
            </p>
          </div>

          <div className="relative w-full lg:w-96 shrink-0">
            <label htmlFor="speaking-podcast-search" className="sr-only">
              Search podcasts
            </label>
            <FaSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 md:text-base pointer-events-none" aria-hidden />
            <Input
              id="speaking-podcast-search"
              type="search"
              placeholder="Search podcasts..."
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 md:pl-12 bg-white border-gray-200 rounded-xl md:rounded-2xl h-10 md:h-12 shadow-sm focus:ring-2 focus:ring-brand-100 transition-all text-sm md:text-base"
            />
          </div>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 pt-2 -mx-3 md:-mx-8 px-3 md:px-8">
        {fetchError && (
          <div className="mb-6 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
            {fetchError}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-12 text-sm md:text-base font-medium">Loading podcasts…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-16">
              {filteredData.map((item) => (
                <SpeakingPodcastCard
                  key={item.id}
                  testId={item.id}
                  title={item.title}
                  image={item.image}
                  durationSeconds={durations[item.id]}
                  videoUrl={item.videoUrl}
                  date={item.date}
                  isPremium={Boolean(item.isPremium)}
                  isProUser={isProMember}
                />
              ))}
            </div>

            {filteredData.length === 0 && (
              <p className="text-gray-500 text-center py-12 text-sm md:text-base font-medium">
                {rows.length === 0
                  ? "No podcasts yet. Add `test` rows with type “podcast”, `image_url`, and `part.video_url`."
                  : "No podcasts match your search."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SpeakingPodcast;
