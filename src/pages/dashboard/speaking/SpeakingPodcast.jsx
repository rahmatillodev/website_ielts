import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import supabase from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { formatDateToDayMonth } from "@/utils/formatDate";
import SpeakingPodcastCard from "./SpeakingPodcastCard";

/**
 * Maps `test` row + nested `part[]` where `type` = podcast.
 * `duration` is passed through unchanged from `test.duration` for overlay display.
 */
function mapPodcastRow(item) {
  const parts = Array.isArray(item.part) ? item.part : item.part ? [item.part] : [];
  const part0 = parts[0];
  const videoUrl = part0?.video_url?.trim?.() || "";

  return {
    id: item.id,
    title: item.title ?? "Untitled",
    duration: item.duration,
    image: item.image_url?.trim?.() || "",
    videoUrl,
    date: item.created_at ? formatDateToDayMonth(item.created_at) : "",
    isPremium: item.is_premium,
  };
}

const SpeakingPodcast = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const authUser = useAuthStore((state) => state.authUser);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  const isProMember =
    authUser?.subscription_status === "premium" ||
    authUser?.user_metadata?.subscription_status === "premium" ||
    authUser?.app_metadata?.plan === "pro";

  const loadPodcasts = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    const { data, error } = await supabase
      .from("test")
      .select(
        `
        id,
        title,
        duration,
        image_url,
        created_at,
        is_premium,
        part (
          video_url
        )
      `
      )
      .eq("type", "podcast")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(error.message || "Could not load podcasts.");
      setRows([]);
      setLoading(false);
      return;
    }

    const list = Array.isArray(data) ? data : [];
    setRows(list.map(mapPodcastRow).filter((x) => x.videoUrl));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authUser?.id) {
      fetchDashboardData(authUser.id, false);
    }
  }, [authUser?.id, fetchDashboardData]);

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

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
              className="pl-10 md:pl-12 bg-white border-gray-200 rounded-xl md:rounded-2xl h-10 md:h-12 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all text-sm md:text-base"
            />
          </div>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 pt-2 -mx-3 md:-mx-8 px-3 md:px-8">
        {fetchError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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
                  title={item.title}
                  image={item.image}
                  duration={item.duration}
                  videoUrl={item.videoUrl}
                  date={item.date}
                  isPremium={item.isPremium}
                  isProUser={isProMember}
                />
              ))}
            </div>

            {filteredData.length === 0 && (
              <p className="text-gray-500 text-center py-12 text-sm md:text-base font-medium">
                {rows.length === 0
                  ? "No podcasts yet. Add `test` rows with type “podcast”, `image_url`, `duration`, and `part.video_url`."
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
