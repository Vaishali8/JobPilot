"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * JobFilters — filter and sort controls for the jobs dashboard.
 *
 * Provides:
 * - Text search (filters by title, company, description)
 * - Sort options (score, date, company)
 * - Source filter (LinkedIn, Indeed, etc.)
 * - Score range filter (All, 80+, 60+, 40+, Unscored)
 */

export type SortOption = "score-desc" | "score-asc" | "date-desc" | "company-asc";
export type ScoreFilter = "all" | "80+" | "60+" | "40+" | "unscored";

interface JobFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  scoreFilter: ScoreFilter;
  onScoreFilterChange: (filter: ScoreFilter) => void;
  sources: string[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
  totalCount: number;
  filteredCount: number;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "score-desc", label: "Score (high to low)" },
  { value: "score-asc", label: "Score (low to high)" },
  { value: "date-desc", label: "Newest first" },
  { value: "company-asc", label: "Company A-Z" },
];

const SCORE_FILTERS: { value: ScoreFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "80+", label: "80+" },
  { value: "60+", label: "60+" },
  { value: "40+", label: "40+" },
  { value: "unscored", label: "Unscored" },
];

export default function JobFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  scoreFilter,
  onScoreFilterChange,
  sources,
  selectedSource,
  onSourceChange,
  totalCount,
  filteredCount,
}: JobFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search + Sort row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, company..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort select */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Score filter + Source filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Score filter chips */}
        <span className="text-xs font-medium text-muted-foreground">Score:</span>
        {SCORE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onScoreFilterChange(f.value)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              scoreFilter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            {f.label}
          </button>
        ))}

        {/* Divider */}
        {sources.length > 0 && (
          <span className="mx-1 text-border">|</span>
        )}

        {/* Source filter chips */}
        {sources.length > 0 && (
          <>
            <span className="text-xs font-medium text-muted-foreground">Source:</span>
            <button
              onClick={() => onSourceChange("")}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                selectedSource === ""
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              All
            </button>
            {sources.map((source) => (
              <button
                key={source}
                onClick={() => onSourceChange(source)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  selectedSource === source
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {source}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        Showing {filteredCount} of {totalCount} jobs
      </p>
    </div>
  );
}
