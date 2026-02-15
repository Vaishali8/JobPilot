"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";
import JobFilters, {
  type SortOption,
  type ScoreFilter,
} from "@/components/JobFilters";
import type { Job } from "@/lib/types";

/**
 * Jobs dashboard page — displays job listings scored against the user's resume.
 *
 * Features:
 * - Loads cached jobs from SQLite on mount
 * - "Search Jobs" triggers Serper API fetch
 * - "Score Jobs" triggers Claude Haiku scoring with SSE progress
 * - Filter by text search, score range, source
 * - Sort by score, date, company
 * - Hide unwanted jobs
 */

// ─── SSE Progress Types ──────────────────────────────────────────────

interface ScoreProgress {
  event: string;
  total?: number;
  alreadyScored?: number;
  completed?: number;
  currentJob?: string;
  score?: number;
  scored?: number;
  skipped?: number;
  failed?: number;
  message?: string;
}

export default function JobsPage() {
  // ─── State ──────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState("");

  // Scoring progress
  const [scoreProgress, setScoreProgress] = useState<ScoreProgress | null>(
    null
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [selectedSource, setSelectedSource] = useState("");

  // ─── Load jobs on mount ─────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // ─── Search Jobs ────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setError("");

    try {
      const res = await fetch("/api/jobs/search", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      // Reload all jobs from DB (includes newly fetched + existing)
      await loadJobs();
    } catch (err) {
      setError("Network error during search. Please try again.");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  }, [loadJobs]);

  // ─── Score Jobs (SSE) ──────────────────────────────────────────────
  const handleScore = useCallback(async () => {
    setIsScoring(true);
    setScoreProgress(null);
    setError("");

    try {
      const res = await fetch("/api/jobs/score", { method: "POST" });

      // If it's a plain JSON response (all scored or error)
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else if (data.message) {
          setScoreProgress({
            event: "done",
            message: data.message,
            scored: data.scored,
            skipped: data.skipped,
          });
        }
        setIsScoring(false);
        await loadJobs();
        return;
      }

      // SSE streaming response
      const reader = res.body?.getReader();
      if (!reader) {
        setError("Failed to read scoring stream");
        setIsScoring(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events (format: "data: {...}\n\n")
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete chunk

        for (const line of lines) {
          const match = line.match(/^data:\s*(.+)$/);
          if (match) {
            try {
              const event = JSON.parse(match[1]) as ScoreProgress;
              setScoreProgress(event);

              if (event.event === "done" || event.event === "error") {
                if (event.event === "error" && event.message) {
                  setError(event.message);
                }
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      }

      // Reload jobs to get updated scores
      await loadJobs();
    } catch (err) {
      setError("Scoring failed. Check your ANTHROPIC_API_KEY.");
      console.error("Score error:", err);
    } finally {
      setIsScoring(false);
    }
  }, [loadJobs]);

  // ─── Hide Job ──────────────────────────────────────────────────────
  const handleHide = useCallback(
    async (jobId: string) => {
      // Optimistic update
      setJobs((prev) => prev.filter((j) => j.id !== jobId));

      try {
        await fetch("/api/jobs/hide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
      } catch {
        // Reload to restore if the API call failed
        await loadJobs();
      }
    },
    [loadJobs]
  );

  // ─── Derived: unique sources ───────────────────────────────────────
  const sources = useMemo(() => {
    const s = new Set<string>();
    for (const job of jobs) {
      if (job.source) s.add(job.source);
    }
    return Array.from(s).sort();
  }, [jobs]);

  // ─── Derived: filtered + sorted jobs ───────────────────────────────
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }

    // Score filter
    if (scoreFilter === "80+") result = result.filter((j) => j.match_score >= 80);
    else if (scoreFilter === "60+") result = result.filter((j) => j.match_score >= 60);
    else if (scoreFilter === "40+") result = result.filter((j) => j.match_score >= 40);
    else if (scoreFilter === "unscored")
      result = result.filter((j) => j.match_score === 0);

    // Source filter
    if (selectedSource) {
      result = result.filter((j) => j.source === selectedSource);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "score-desc":
          return b.match_score - a.match_score;
        case "score-asc":
          return a.match_score - b.match_score;
        case "date-desc":
          return (b.fetched_at || "").localeCompare(a.fetched_at || "");
        case "company-asc":
          return (a.company || "").localeCompare(b.company || "");
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, searchQuery, scoreFilter, selectedSource, sortBy]);

  // ─── Scoring progress bar ──────────────────────────────────────────
  const progressPercent =
    scoreProgress?.total && scoreProgress.completed
      ? Math.round((scoreProgress.completed / scoreProgress.total) * 100)
      : 0;

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Job Listings
          </h1>
          <p className="mt-1 text-muted-foreground">
            Jobs matched and scored against your resume.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSearch}
            disabled={isSearching || isScoring}
            variant="outline"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isSearching ? "Searching..." : "Search Jobs"}
          </Button>

          <Button
            onClick={handleScore}
            disabled={isScoring || isSearching || jobs.length === 0}
          >
            {isScoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isScoring ? "Scoring..." : "Score Jobs"}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scoring progress bar */}
      {isScoring && scoreProgress && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              Scoring jobs with Claude...
            </span>
            <span className="text-muted-foreground">
              {scoreProgress.completed || 0} / {scoreProgress.total || 0}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {scoreProgress.currentJob && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {scoreProgress.currentJob}
              {scoreProgress.score !== undefined && ` — Score: ${scoreProgress.score}`}
            </p>
          )}
        </div>
      )}

      {/* Score complete summary */}
      {!isScoring &&
        scoreProgress?.event === "done" &&
        (scoreProgress.scored ?? 0) > 0 && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Scored {scoreProgress.scored} jobs
            {(scoreProgress.skipped ?? 0) > 0 && ` (${scoreProgress.skipped} already scored)`}
            {(scoreProgress.failed ?? 0) > 0 && `, ${scoreProgress.failed} failed`}.
            <button
              onClick={() => setScoreProgress(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

      {/* Filters */}
      {jobs.length > 0 && (
        <div className="mt-6">
          <JobFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            scoreFilter={scoreFilter}
            onScoreFilterChange={setScoreFilter}
            sources={sources}
            selectedSource={selectedSource}
            onSourceChange={setSelectedSource}
            totalCount={jobs.length}
            filteredCount={filteredJobs.length}
          />
        </div>
      )}

      {/* Job cards grid */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          /* Empty state */
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              No jobs yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set your preferences, then click &quot;Search Jobs&quot; to fetch listings.
            </p>
            <Button onClick={handleSearch} className="mt-4" disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search Jobs
            </Button>
          </div>
        ) : filteredJobs.length === 0 ? (
          /* No results for current filters */
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <RefreshCw className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              No jobs match your filters
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onHide={handleHide} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
