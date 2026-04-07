import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lightbulb, MessageSquare, CheckCircle2 } from "lucide-react";
import { FaArrowLeft } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import TipCard from "./TipCard";

const tipsData = [
  {
    id: 1,
    type: "Part 1",
    category: "Parts",
    title: "Answer + Reason + Mini Example",
    desc: "Avoid one-word answers and extend naturally in 2–3 sentences.",
    content:
      "Part 1 checks fluency and natural communication. Use a short structure: direct answer, one reason, and a small personal example.",
    steps: [
      "Give a direct answer first.",
      "Add one clear reason (because / since).",
      "Finish with a brief personal example.",
    ],
    examples: [
      {
        q: "Do you like cooking?",
        a: "Yes, I do. I find it relaxing after work because it helps me switch off. For example, I usually cook pasta on weekends.",
      },
    ],
  },
  {
    id: 2,
    type: "Part 2",
    category: "Parts",
    title: "1-Minute Notes Framework",
    desc: "Use keyword notes, not full sentences, before your long turn.",
    content:
      "In Part 2, your preparation minute is for organizing ideas. Keyword notes keep you fluent for the full two minutes.",
    steps: ["Write 4–5 keywords (who, where, what, why).", "Choose tense and stay consistent.", "Use linking phrases between points."],
    examples: [
      {
        q: "Describe a useful skill you learned.",
        a: "I'd like to talk about public speaking, which I learned at university. I practiced weekly with classmates, and now I can present clearly in meetings.",
      },
    ],
  },
  {
    id: 3,
    type: "Part 3",
    category: "Parts",
    title: "Opinion → Explain → Contrast",
    desc: "Build deeper answers with logic and comparison.",
    content:
      "Part 3 is more abstract. State your opinion, explain with a clear reason, then add contrast (however / on the other hand).",
    steps: ["State your opinion in one sentence.", "Support it with a social or personal reason.", "Add contrast with another view or past vs present."],
    examples: [
      {
        q: "Should children learn history at school?",
        a: "Yes, because it builds critical thinking. However, it should be taught through discussion, not only memorization.",
      },
    ],
  },
  {
    id: 4,
    type: "General Strategy",
    category: "Strategy",
    title: "Paraphrase safely",
    desc: "Show vocabulary range without forcing unnatural synonyms.",
    content:
      "Paraphrasing helps at higher bands, but accuracy matters more than rare words. Change structure or key words only when you are confident.",
    steps: [
      "Prepare a few reliable synonyms for common topics.",
      "Vary sentence structure, not only single words.",
      "Prioritize clarity over complexity.",
    ],
    examples: [
      {
        q: "Do you enjoy films?",
        a: "Absolutely — I'm quite keen on movies, especially science fiction, because they combine creativity with ideas.",
      },
    ],
  },
];

export default function SimpleTips({ activeTab, setActiveTab, searchQuery, setSearchQuery, viewMode = "list", onViewChange }) {
  const { tipId } = useParams();
  const navigate = useNavigate();

  const filteredTips = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return tipsData.filter((tip) => {
      const matchesTab = activeTab === "All" || tip.category === activeTab;
      if (!q) return matchesTab;
      const hay = [tip.type, tip.title, tip.desc, tip.content].join(" ").toLowerCase();
      return matchesTab && hay.includes(q);
    });
  }, [activeTab, searchQuery]);

  if (tipId) {
    const tip = tipsData.find((t) => String(t.id) === String(tipId));

    if (!tip) {
      return (
        <div className="mx-auto w-full max-w-5xl animate-in fade-in slide-in-from-right-4 duration-500 px-0">
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="mb-4 text-slate-600">Tip not found.</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard/speaking/tips")}
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-500 transition-colors hover:text-blue-600"
            >
              <FaArrowLeft size={12} />
              Back to tips
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-5xl animate-in fade-in slide-in-from-right-4 duration-500">
        <button
          type="button"
          onClick={() => navigate("/dashboard/speaking/tips")}
          className="mb-6 flex max-w-max items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-500 transition-colors hover:text-blue-600"
        >
          <FaArrowLeft size={14} className="shrink-0" aria-hidden />
          <span>Back to tips</span>
        </button>

        <article className="w-full">
          <header className="mb-10 border-b border-gray-200 pb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-600 sm:text-sm">{tip.type}</p>
            <h1 className="mb-4 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl md:text-4xl">{tip.title}</h1>
            <p className="mb-4 text-base font-medium leading-relaxed text-slate-700">{tip.desc}</p>
            <p className="max-w-4xl text-base leading-relaxed text-slate-600">{tip.content}</p>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-600 sm:text-sm">
                <Lightbulb className="size-5 shrink-0 text-amber-500" aria-hidden />
                Steps
              </h2>
              <ul className="space-y-5">
                {tip.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
                    <span className="text-base leading-relaxed text-slate-700">
                      <span className="font-semibold text-slate-900">{index + 1}.</span> {step}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-blue-400/40 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 shadow-lg sm:p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white sm:text-sm">
                <MessageSquare className="size-5 shrink-0 text-white/95" aria-hidden />
                Model Answer
              </h2>
              <div className="space-y-6">
                {tip.examples.map((ex) => (
                  <div key={ex.q} className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-100">Question</p>
                      <p className="text-base font-semibold leading-snug text-white">{ex.q}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-100">Answer</p>
                      <p className="rounded-2xl border border-white/35 bg-black/25 p-4 text-base font-medium leading-relaxed text-white shadow-inner">{`"${ex.a}"`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </article>
      </div>
    );
  }

  const isGrid = viewMode === "grid";

  const headerNavRow = (
    <div className="mb-6 flex w-full min-w-0 flex-row flex-nowrap items-center gap-6 overflow-x-auto">
      <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {["All", "Parts", "Strategy"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all md:px-7 ${
              activeTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-blue-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="min-h-0 min-w-0 flex-1" />
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <div className="relative min-w-[10rem] max-w-md md:max-w-xl lg:max-w-2xl">
          <FaSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 md:text-base" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl border-gray-200 bg-white pl-10 text-sm shadow-sm transition-all focus:ring-2 focus:ring-blue-100 md:h-12 md:rounded-2xl md:pl-12 md:text-base"
            placeholder="Search tips..."
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode === "grid" ? "grid" : "list"}
          onValueChange={onViewChange}
          className="flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-gray-100/80 p-1 shadow-sm"
        >
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className="flex items-center justify-center rounded-lg p-2 transition-all duration-200 md:rounded-xl md:p-2.5
              data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm
              data-[state=off]:text-gray-400 hover:text-gray-600
              [&:not(:first-child)]:rounded-lg [&:not(:last-child)]:rounded-lg"
          >
            <IoListOutline size={20} className="md:h-6 md:w-6" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grid"
            aria-label="Grid view"
            className="flex items-center justify-center rounded-lg p-2 transition-all duration-200 md:rounded-xl md:p-2.5
              data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm
              data-[state=off]:text-gray-400 hover:text-gray-600
              [&:not(:first-child)]:rounded-lg [&:not(:last-child)]:rounded-lg"
          >
            <IoGridOutline size={20} className="md:h-6 md:w-6" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );

  if (filteredTips.length === 0) {
    return (
      <>
        {headerNavRow}
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-10 text-center text-slate-500">
          No tips match your filters.
        </div>
      </>
    );
  }

  return (
    <>
      {headerNavRow}
      <div
        className={
          isGrid
            ? "grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8"
            : "flex w-full flex-col gap-2"
        }
      >
        {filteredTips.map((item) => (
          <TipCard key={item.id} data={item} viewMode={viewMode} />
        ))}
      </div>
    </>
  );
}
