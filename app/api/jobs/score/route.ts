import { getDatabase } from "@/lib/db";
import { scoreJobs } from "@/lib/job-scorer";
import type { Job, PreferencesRow } from "@/lib/types";

/**
 * Job scoring API route.
 * POST — Score unscored job listings against the user's resume using Claude Haiku.
 *
 * Uses Server-Sent Events (SSE) to stream progress back to the client.
 * Each event is a JSON object with: { completed, total, currentJob, score? }
 * The final event has type "done" with aggregate results.
 *
 * Scores are cached in SQLite — jobs with match_score > 0 are skipped.
 */
export async function POST() {
  const db = getDatabase();

  // Load resume text from preferences
  const prefsRow = db
    .prepare("SELECT resume_text FROM preferences WHERE id = 1")
    .get() as Pick<PreferencesRow, "resume_text"> | undefined;

  const resumeText = prefsRow?.resume_text || "";

  // Load all non-hidden jobs (scorer will filter out already-scored ones)
  const jobs = db
    .prepare("SELECT * FROM jobs WHERE is_hidden = 0")
    .all() as Job[];

  if (jobs.length === 0) {
    return new Response(
      JSON.stringify({ error: "No jobs to score. Search for jobs first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check how many actually need scoring
  const unscoredCount = jobs.filter((j) => j.match_score === 0).length;
  if (unscoredCount === 0) {
    return new Response(
      JSON.stringify({
        event: "done",
        scored: 0,
        skipped: jobs.length,
        failed: 0,
        message: "All jobs are already scored.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Prepare the update statement for persisting scores
  const updateScore = db.prepare(`
    UPDATE jobs
    SET match_score = ?, match_reasoning = ?
    WHERE id = ?
  `);

  // Stream progress via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(
        type: string,
        data: Record<string, unknown>
      ) {
        const payload = JSON.stringify({ event: type, ...data });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      sendEvent("start", {
        total: unscoredCount,
        alreadyScored: jobs.length - unscoredCount,
      });

      try {
        const result = await scoreJobs(jobs, resumeText, (progress) => {
          sendEvent("progress", { ...progress });
        });

        // Persist all scores to SQLite
        const persistScores = db.transaction(() => {
          for (const r of result.results) {
            updateScore.run(r.score.score, r.score.reasoning, r.jobId);
          }
        });
        persistScores();

        sendEvent("done", {
          scored: result.scored,
          skipped: result.skipped,
          failed: result.failed,
        });
      } catch (error) {
        console.error("Scoring stream error:", error);
        const message =
          error instanceof Error ? error.message : "Scoring failed";
        sendEvent("error", { message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
