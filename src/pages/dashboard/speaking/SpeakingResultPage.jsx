import React, { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const COLOR = "#2D9CDB";

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
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #f0f0f0",
        padding: "16px 40px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <button
            onClick={() => navigate("/speaking-library")}
            style={{
              background: COLOR, color: "#fff", border: "none",
              borderRadius: 8, padding: "7px 14px",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#1a7ab8"}
            onMouseLeave={(e) => e.currentTarget.style.background = COLOR}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
            Your Recordings
          </h1>
          <div style={{ fontSize: 12, color: "#9ca3af", display: "flex", gap: 6, alignItems: "center" }}>
          <span>Speaking</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: COLOR, fontWeight: 600 }}>Results</span>
        </div>
          </div>
        </div>
        
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px" }}>

        {recordings.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 16,
            border: "1px solid #f0f0f0", padding: 48,
            textAlign: "center", color: "#6b7280",
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d5db" style={{ marginBottom: 16 }}>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <p style={{ fontSize: 16, marginBottom: 16 }}>No recordings found.</p>
            <button
              onClick={() => navigate(-1)}
              style={{
                color: COLOR, fontWeight: 600,
                background: "none", border: "none",
                cursor: "pointer", fontSize: 14,
              }}
            >
              ← Go back
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {grouped.map(([partLabel, items]) => (
              <div key={partLabel}>

                {/* Part header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
                }}>
                  <div style={{
                    background: COLOR, color: "#fff",
                    borderRadius: 8, padding: "5px 16px",
                    fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
                  }}>
                    {partLabel}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                  <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
                    {items.length} question{items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Question cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {items.map((item, qi) => (
                    <div key={`${item.questionId}-${qi}`} style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1px solid #f0f0f0",
                      padding: "20px 24px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}>
                      <p style={{
                        fontSize: 11, fontWeight: 700, color: COLOR,
                        textTransform: "uppercase", letterSpacing: 1,
                        margin: "0 0 8px",
                      }}>
                        Question {qi + 1}
                      </p>
                      <p style={{
                        color: "#111827", fontSize: 15,
                        margin: "0 0 16px", lineHeight: 1.6,
                      }}>
                        {item.question}
                      </p>
                      {item.url ? (
                        <audio
                          controls
                          src={item.url}
                          style={{ width: "100%", maxWidth: 500 }}
                        />
                      ) : (
                        <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
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