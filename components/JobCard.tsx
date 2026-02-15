"use client";

import {
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

/**
 * JobCard — displays a single job listing with score, details, and actions.
 *
 * Features:
 * - Color-coded score badge (green/yellow/orange/red)
 * - Expandable to show full description + match reasoning
 * - Apply link + hide button
 */

interface JobCardProps {
  job: Job;
  onHide: (jobId: string) => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (score >= 40) return "bg-orange-100 text-orange-800 border-orange-200";
  if (score > 0) return "bg-red-100 text-red-800 border-red-200";
  return "bg-muted text-muted-foreground";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Partial";
  if (score > 0) return "Weak";
  return "Unscored";
}

export default function JobCard({ job, onHide }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header: Score + Title + Company */}
      <div className="flex items-start gap-3">
        {/* Score badge */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-center",
            getScoreColor(job.match_score)
          )}
        >
          <span className="text-lg font-bold leading-none">
            {job.match_score > 0 ? job.match_score : "—"}
          </span>
          <span className="text-[10px] leading-none">
            {getScoreLabel(job.match_score)}
          </span>
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {job.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {job.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            {job.posted_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {job.posted_date}
              </span>
            )}
          </div>
        </div>

        {/* Source badge */}
        {job.source && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {job.source}
          </Badge>
        )}
      </div>

      {/* Employment type badge row */}
      {job.employment_type && (
        <div className="mt-2 ml-15">
          <Badge variant="outline" className="text-[10px]">
            {job.employment_type}
          </Badge>
        </div>
      )}

      {/* Match reasoning (when scored) */}
      {job.match_score > 0 && job.match_reasoning && (
        <p className="mt-2 text-xs text-muted-foreground italic">
          {job.match_reasoning}
        </p>
      )}

      {/* Expandable description */}
      {(job.description || job.apply_link) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> More
              </>
            )}
          </button>

          {expanded && (
            <div className="mt-2 space-y-3">
              {job.description && (
                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                  {job.description}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        {job.apply_link && (
          <Button size="sm" variant="default" asChild>
            <a
              href={job.apply_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Apply
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onHide(job.id)}
          className="text-muted-foreground"
        >
          <EyeOff className="h-3 w-3" />
          Hide
        </Button>
      </div>
    </div>
  );
}
