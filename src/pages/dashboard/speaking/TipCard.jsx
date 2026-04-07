import React from "react";
import { useNavigate } from "react-router-dom";
import { Target, Star, ChevronRight } from "lucide-react";

export default function TipCard({ data, viewMode = "list" }) {
  const navigate = useNavigate();

  if (!data) return null;

  const go = () => navigate(`/dashboard/speaking/tips/${data.id}`);
  const isParts = data.category === "Parts";
  const isGrid = viewMode === "grid";

  if (isGrid) {
    return (
      <article
        onClick={go}
        className="group flex h-full cursor-pointer flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
      >
        <div className="flex flex-1 flex-col items-center gap-3 text-center">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              isParts ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            {isParts ? <Target size={26} /> : <Star size={26} />}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">{data.title}</h3>
              <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                {data.type}
              </span>
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{data.desc}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go();
          }}
          className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Start Tip
        </button>
      </article>
    );
  }

  return (
    <article
      onClick={go}
      className="group flex w-full max-w-full flex-row items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:gap-4 sm:px-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            isParts ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {isParts ? <Target size={22} /> : <Star size={22} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-blue-600 md:text-lg">{data.title}</h3>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              {data.type}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          go();
        }}
        aria-label="Start tip"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2.5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4 sm:py-2.5"
      >
        <span className="hidden sm:inline">Start Tip</span>
        <ChevronRight className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" strokeWidth={2.5} aria-hidden />
      </button>
    </article>
  );
}
