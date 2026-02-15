/**
 * Job scoring logic — scores how well each job matches the user's resume.
 *
 * Sends resume text + job description to Claude Haiku and parses
 * the structured score response (0-100 with reasoning).
 *
 * Key design decisions:
 * - Batches of 5 jobs scored in parallel to balance speed vs. rate limits.
 * - Jobs with match_score > 0 are already cached and skipped.
 * - Returns a progress callback so the UI can show a progress indicator.
 */

import { callClaude } from "./claude";
import type { Job, JobScoreResult } from "./types";

const BATCH_SIZE = 5;

const SCORING_SYSTEM_PROMPT = `You are a job matching expert. You score how well a job listing matches a candidate's resume.

You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.

Response format:
{
  "score": <number 0-100>,
  "reasoning": "<1-2 sentence explanation>",
  "key_matches": ["<matching skill/experience 1>", "<matching skill/experience 2>"],
  "gaps": ["<missing requirement 1>", "<missing requirement 2>"]
}

Scoring guidelines:
- 80-100: Strong match — most key requirements met, relevant experience
- 60-79: Good match — many requirements met, some gaps
- 40-59: Partial match — some relevant skills but significant gaps
- 20-39: Weak match — few matching qualifications
- 0-19: Poor match — almost no relevance

Be fair but realistic. Consider transferable skills. A fresh graduate applying for a senior role should score low, but a mid-level engineer applying for a slightly different role with overlapping skills should score moderately.`;

/**
 * Builds the user prompt for scoring a single job.
 */
function buildScoringPrompt(job: Job, resumeText: string): string {
  return `Score this job against the candidate's resume.

## Job Listing
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Type: ${job.employment_type || "Not specified"}
- Description: ${job.description || "No description available"}

## Candidate Resume
${resumeText || "(No resume provided — score based on job title match only)"}`;
}

/**
 * Parses Claude's JSON response into a JobScoreResult.
 * Handles edge cases where the response might be wrapped in markdown fences.
 */
function parseScoreResponse(text: string): JobScoreResult {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
    reasoning: String(parsed.reasoning || ""),
    key_matches: Array.isArray(parsed.key_matches) ? parsed.key_matches : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
  };
}

/**
 * Scores a single job against the resume using Claude Haiku.
 */
async function scoreOneJob(
  job: Job,
  resumeText: string
): Promise<JobScoreResult> {
  const prompt = buildScoringPrompt(job, resumeText);

  const response = await callClaude(
    "haiku",
    SCORING_SYSTEM_PROMPT,
    [{ role: "user", content: prompt }],
    512
  );

  return parseScoreResponse(response);
}

/** Callback for tracking scoring progress */
export type ProgressCallback = (progress: {
  completed: number;
  total: number;
  currentJob: string;
  score?: number;
}) => void;

/** Result of a batch scoring run */
export interface ScoringResult {
  scored: number;
  skipped: number;
  failed: number;
  results: { jobId: string; score: JobScoreResult }[];
}

/**
 * Scores multiple jobs in batches of 5.
 *
 * - Skips jobs that already have a score (match_score > 0).
 * - Calls the onProgress callback after each job completes.
 * - Returns aggregate results for the API to persist.
 */
export async function scoreJobs(
  jobs: Job[],
  resumeText: string,
  onProgress?: ProgressCallback
): Promise<ScoringResult> {
  // Filter out already-scored jobs
  const unscoredJobs = jobs.filter((j) => j.match_score === 0);
  const skipped = jobs.length - unscoredJobs.length;

  const result: ScoringResult = {
    scored: 0,
    skipped,
    failed: 0,
    results: [],
  };

  const total = unscoredJobs.length;
  if (total === 0) return result;

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = unscoredJobs.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (job) => {
        const score = await scoreOneJob(job, resumeText);
        return { jobId: job.id, job, score };
      })
    );

    for (const settled of batchResults) {
      if (settled.status === "fulfilled") {
        const { jobId, job, score } = settled.value;
        result.scored++;
        result.results.push({ jobId, score });

        onProgress?.({
          completed: result.scored + result.failed,
          total,
          currentJob: job.title,
          score: score.score,
        });
      } else {
        result.failed++;
        onProgress?.({
          completed: result.scored + result.failed,
          total,
          currentJob: "Error scoring job",
        });
        console.error("Scoring failed for a job:", settled.reason);
      }
    }
  }

  return result;
}
