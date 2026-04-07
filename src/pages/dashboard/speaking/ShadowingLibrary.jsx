import React, { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="p-8 max-w-7xl mx-auto font-sans text-left">
        <button
          type="button"
          onClick={() => navigate("/speaking")}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors mb-8 font-semibold group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" aria-hidden />
          Back to Speaking
        </button>

        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-[900] text-slate-900 tracking-tight mb-2">
              Shadowing Library
            </h1>
            <p className="text-slate-500 text-lg font-medium">
              Master your speaking by mimicking native speakers with our curated video library.
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <label htmlFor="shadowing-library-search" className="sr-only">
              Search shadowing topics
            </label>
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"
              aria-hidden
            />
            <input
              id="shadowing-library-search"
              type="search"
              placeholder="Search shadowing topics..."
              autoComplete="off"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all text-left"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {fetchError && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {fetchError}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-center py-12">Loading shadowing library…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
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
              <p className="text-slate-500 text-center py-12">
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
