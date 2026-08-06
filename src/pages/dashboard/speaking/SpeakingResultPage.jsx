import React, { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * The recordings a student just made, grouped by part.
 *
 * This page used to be built entirely from inline `style` objects with literal
 * hex — its own page background, its own border grey, its own three text greys —
 * so none of it moved when the token set did. It is now plain utilities on the
 * shared ramps, which is also what lets it match the reading and listening
 * result pages: same page background, same card border, same back control.
 */
const SpeakingResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const recordings = location.state?.recordings ?? [];

  const audioUrls = useMemo(() => {
    return recordings.map((r) => ({
      ...r,
      url: r.blob ? URL.createObjectURL(r.blob) : "",
    }));
  }, []);

  useEffect(() => {
    return () => {
      audioUrls.forEach((x) => { if (x.url) URL.revokeObjectURL(x.url); });
    };
  }, [audioUrls]);

  const grouped = useMemo(() => {
    const map = {};
    audioUrls.forEach((item) => {
      const key = item.partLabel || "Other";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [audioUrls]);

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate("/speaking-library")}
            size="sm"
            className="gap-1.5"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Your Recordings
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Speaking</span>
              <span className="text-gray-300">/</span>
              <span className="font-semibold text-primary-text">Results</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[820px] px-6 py-10">
        {recordings.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              className="mx-auto mb-4 fill-gray-300"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <p className="mb-4 text-base">No recordings found.</p>
            <Button variant="link" onClick={() => navigate(-1)} className="font-semibold">
              ← Go back
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-9">
            {grouped.map(([partLabel, items]) => (
              <div key={partLabel}>
                {/* Part header */}
                <div className="mb-4 flex items-center gap-3.5">
                  <div className="whitespace-nowrap rounded-lg bg-primary px-4 py-1.5 text-[13px] font-bold text-primary-foreground">
                    {partLabel}
                  </div>
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="whitespace-nowrap text-xs text-gray-500">
                    {items.length} question{items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Question cards */}
                <div className="flex flex-col gap-3">
                  {items.map((item, qi) => (
                    <div
                      key={`${item.questionId}-${qi}`}
                      className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm"
                    >
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary-text">
                        Question {qi + 1}
                      </p>
                      <p className="mb-4 text-[15px] leading-relaxed text-gray-900">
                        {item.question}
                      </p>
                      {item.url ? (
                        <audio controls src={item.url} className="w-full max-w-[500px]" />
                      ) : (
                        <p className="text-[13px] text-gray-500">
                          No audio recorded.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SpeakingResultPage;
