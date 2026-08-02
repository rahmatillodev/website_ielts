import React from "react";
import { LuSearch, LuSlidersHorizontal, LuX } from "react-icons/lu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { QUESTION_TYPE_GROUPS, getQuestionTypeDisplayName } from "@/store/testStore/utils/questionTypeUtils";
import { WRITING_TASK_TYPES, getWritingTaskTypeDisplayName } from "@/store/testStore/utils/writingTaskTypeUtils";

/**
 * The library's control row: search and one filter button, nothing else.
 *
 * Everything that filters the list now lives inside the popover — access level,
 * difficulty, parts, question/task types and sort. The access tabs and the
 * inline parts chips used to sit out here and applied immediately; folding them
 * into the panel means every filter follows the same seed-on-open / commit-on-
 * Apply contract, so there is one mental model instead of two.
 *
 * The row renders identically for all four test types. Sections inside the
 * panel appear only when the current type actually has those options, which is
 * why writing shows Task but no Parts, and speaking shows neither.
 */

const ACCESS_OPTIONS = [
  ["All Tests", "All tests"],
  ["free", "Free"],
  ["premium", "Premium"],
];

const LibraryToolbar = ({
  testType,
  searchQuery,
  onSearchChange,
  availablePartLabels,
  availableWritingTaskLabels,
  availableDifficulties,
  resultCount,
  hasActiveFilters,
  // filter popover
  filterOpen,
  onFilterOpenChange,
  onFilterOpen,
  onFilterApply,
  onFilterClear,
  tempAccess,
  onAccessChange,
  tempSelectedDifficulties,
  onToggleDifficulty,
  tempSelectedTypes,
  onToggleType,
  tempSelectedPartLabels,
  onToggleTempPart,
  tempSelectedWritingTaskLabels,
  onToggleTempWritingTask,
  tempSortOrder,
  onSortChange,
  activeFilterCount,
}) => {
  const showTypeFilter = testType !== "speaking";
  const typeOptions = testType === "writing" ? WRITING_TASK_TYPES : QUESTION_TYPE_GROUPS;
  const typeLabel = testType === "writing" ? "Task types" : "Question types";
  const typeName = (t) =>
    testType === "writing" ? getWritingTaskTypeDisplayName(t) : getQuestionTypeDisplayName(t);

  const sectionTitle = "mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400";
  const optionRow =
    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50";

  return (
    <div className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/85 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-3 md:px-8">
        <div className="relative min-w-0 flex-1 md:max-w-sm">
          <LuSearch
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search"
            aria-label="Search tests by title"
            className="h-9 w-full rounded-lg border border-transparent bg-gray-100 pl-9 pr-3 text-[13px] text-gray-900 placeholder:text-gray-400 transition-all focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <Popover open={filterOpen} onOpenChange={onFilterOpenChange}>
          <PopoverTrigger asChild>
            <button
              onClick={onFilterOpen}
              aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
              className={`relative ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                filterOpen || activeFilterCount > 0
                  ? "border-gray-300 bg-gray-50 text-gray-900"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <LuSlidersHorizontal className="size-[17px]" />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold tabular-nums text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="z-50 flex max-h-[min(80vh,560px)] w-[min(340px,calc(100vw-24px))] flex-col rounded-xl border border-gray-200 bg-white p-0 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-12px_rgba(16,24,40,0.22)]"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-[13px] font-semibold text-gray-900">Filters</span>
              <button
                onClick={onFilterClear}
                className="text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-900"
              >
                Reset
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <section className="mb-4">
                <h3 className={sectionTitle}>Access</h3>
                <div className="space-y-0.5">
                  {ACCESS_OPTIONS.map(([value, label]) => (
                    <label key={value} className={optionRow}>
                      <input
                        type="radio"
                        name="libraryAccess"
                        value={value}
                        checked={tempAccess === value}
                        onChange={() => onAccessChange(value)}
                        className="size-3.5 accent-brand-600"
                      />
                      <span className="text-[13px] text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {availableDifficulties.length > 0 && (
                <section className="mb-4">
                  <h3 className={sectionTitle}>Difficulty</h3>
                  <div className="space-y-0.5">
                    {availableDifficulties.map((level) => (
                      <label key={level} className={optionRow}>
                        <Checkbox
                          checked={tempSelectedDifficulties.includes(level)}
                          onCheckedChange={() => onToggleDifficulty(level)}
                          className="size-4 accent-brand-600"
                        />
                        <span className="text-[13px] capitalize text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {testType === "writing" && availableWritingTaskLabels.length > 0 && (
                <section className="mb-4">
                  <h3 className={sectionTitle}>Task</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {availableWritingTaskLabels.map((label) => (
                      <label key={label} className={optionRow}>
                        <Checkbox
                          checked={tempSelectedWritingTaskLabels.includes(label)}
                          onCheckedChange={() => onToggleTempWritingTask(label)}
                          className="size-4 accent-brand-600"
                        />
                        <span className="text-[13px] text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {availablePartLabels.length > 0 && (
                <section className="mb-4">
                  <h3 className={sectionTitle}>Parts</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePartLabels.map((label) => (
                      <label key={label} className={optionRow}>
                        <Checkbox
                          checked={tempSelectedPartLabels.includes(label)}
                          onCheckedChange={() => onToggleTempPart(label)}
                          className="size-4 accent-brand-600"
                        />
                        <span className="text-[13px] text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {showTypeFilter && (
                <section className="mb-4">
                  <h3 className={sectionTitle}>{typeLabel}</h3>
                  <div className="space-y-0.5">
                    {typeOptions.map((type) => (
                      <label key={type} className={optionRow}>
                        <Checkbox
                          checked={tempSelectedTypes.includes(type)}
                          onCheckedChange={() => onToggleType(type)}
                          className="size-4 accent-brand-600"
                        />
                        <span className="text-[13px] text-gray-700">{typeName(type)}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className={sectionTitle}>Sort</h3>
                <div className="space-y-0.5">
                  {[["newest", "Newest first"], ["oldest", "Oldest first"]].map(([value, label]) => (
                    <label key={value} className={optionRow}>
                      <input
                        type="radio"
                        name="librarySort"
                        value={value}
                        checked={tempSortOrder === value}
                        onChange={() => onSortChange(value)}
                        className="size-3.5 accent-brand-600"
                      />
                      <span className="text-[13px] text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="border-t border-gray-100 p-3">
              <button
                onClick={onFilterApply}
                className="h-9 w-full rounded-lg bg-brand-600 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Apply
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Only feedback that a filter is narrowing the list, now that the tabs and
          chips no longer show it on the surface. Hidden when nothing is active. */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-3 pb-2.5 text-[12px] text-gray-500 md:px-8">
          <span className="tabular-nums">
            {resultCount} {resultCount === 1 ? "test" : "tests"}
          </span>
          <button
            onClick={onFilterClear}
            className="inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-gray-900"
          >
            <LuX className="size-3" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default LibraryToolbar;
