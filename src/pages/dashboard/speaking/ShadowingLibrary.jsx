import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import supabase from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { formatDateToDayMonth } from "@/utils/formatDate";
import ShadowingCard from "./ShadowingCard";

/**
 * Maps `test` row + nested `part[]` (SQL schema).
 * - duration: `test.duration` (minutes from DB, passed through unchanged)
 * - image: `test.image_url`
 * - video: `part[0].video_url` (empty `part` → no video)
 */
function mapItemForCard(item) {
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
  };
}

const ShadowingLibrary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const authUser = useAuthStore((state) => state.authUser);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);

  /** Narrow columns + defer dashboard fetch so this page is not blocked by user_attempts + test metadata. */
  useEffect(() => {
    let cancelled = false;

    (async () => {
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
          part (
            video_url
          )
        `
        )
        .eq("type", "shadowing")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setFetchError(error.message || "Could not load shadowing library.");
        setRows([]);
        setLoading(false);
      } else {
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map(mapItemForCard).filter((x) => x.videoUrl);
        setRows(mapped);
        setLoading(false);
      }

      if (authUser?.id) {
        fetchDashboardData(authUser.id, false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, fetchDashboardData]);

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
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Shadowing Library</h1>
            <p className="text-sm md:text-base text-gray-500 font-medium tracking-tight w-full lg:w-8/12">
              Master your speaking by mimicking native speakers with our curated video library.
            </p>
          </div>

          <div className="relative w-full lg:w-96 shrink-0">
            <label htmlFor="shadowing-library-search" className="sr-only">
              Search shadowing topics
            </label>
            <FaSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 md:text-base pointer-events-none" aria-hidden />
            <Input
              id="shadowing-library-search"
              type="search"
              placeholder="Search shadowing topics..."
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
          <p className="text-gray-500 text-center py-12 text-sm md:text-base font-medium">Loading shadowing library…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-16">
              {filteredData.map((item) => (
                <ShadowingCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  duration={item.duration}
                  videoUrl={item.videoUrl}
                  date={item.date}
                />
              ))}
            </div>

            {filteredData.length === 0 && (
              <p className="text-gray-500 text-center py-12 text-sm md:text-base font-medium">
                {rows.length === 0
                  ? "No shadowing content yet. Add `test` rows with type “shadowing”, `image_url`, `duration`, and `part.video_url`."
                  : "No shadowing topics match your search."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShadowingLibrary;
