import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { searchJobs } from "@/lib/serper";
import type { Preferences, PreferencesRow, Job } from "@/lib/types";

/**
 * Job search API route.
 * POST — Fetch job listings from Serper API based on saved preferences.
 *
 * Flow:
 *   1. Load preferences from SQLite.
 *   2. Build queries and call Serper API via lib/serper.ts.
 *   3. Upsert results into the jobs table (skip duplicates).
 *   4. Record search history.
 *   5. Return the fetched jobs + metadata.
 */

function parsePreferencesRow(row: PreferencesRow): Preferences {
  return {
    id: row.id,
    roles: JSON.parse(row.roles),
    employment_types: JSON.parse(row.employment_types),
    location_types: JSON.parse(row.location_types),
    cities: JSON.parse(row.cities),
    posting_age: row.posting_age as Preferences["posting_age"],
    additional_preferences: row.additional_preferences,
    resume_text: row.resume_text,
    resume_filename: row.resume_filename,
    updated_at: row.updated_at,
  };
}

export async function POST() {
  try {
    const db = getDatabase();

    // 1. Load preferences
    const row = db
      .prepare("SELECT * FROM preferences WHERE id = 1")
      .get() as PreferencesRow | undefined;

    if (!row) {
      return NextResponse.json(
        { error: "No preferences saved yet. Set your preferences first." },
        { status: 400 }
      );
    }

    const prefs = parsePreferencesRow(row);

    if (prefs.roles.length === 0) {
      return NextResponse.json(
        { error: "Add at least one role in your preferences before searching." },
        { status: 400 }
      );
    }

    // 2. Call Serper API
    const result = await searchJobs(prefs);

    // 3. Upsert jobs into database (INSERT OR IGNORE to skip duplicates)
    const upsert = db.prepare(`
      INSERT OR IGNORE INTO jobs (
        id, title, company, location, description,
        employment_type, posted_date, apply_link, source,
        match_score, match_reasoning, raw_data, fetched_at, is_hidden
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    const insertMany = db.transaction((jobs: Job[]) => {
      let inserted = 0;
      for (const job of jobs) {
        const info = upsert.run(
          job.id,
          job.title,
          job.company,
          job.location,
          job.description,
          job.employment_type,
          job.posted_date,
          job.apply_link,
          job.source,
          job.match_score,
          job.match_reasoning,
          job.raw_data,
          job.fetched_at,
          job.is_hidden
        );
        if (info.changes > 0) inserted++;
      }
      return inserted;
    });

    const newJobsInserted = insertMany(result.jobs);

    // 4. Record search history
    const recordSearch = db.prepare(
      "INSERT INTO search_history (query, results_count) VALUES (?, ?)"
    );
    for (const query of result.queries) {
      recordSearch.run(query, result.jobs.length);
    }

    // 5. Return results
    return NextResponse.json({
      jobs: result.jobs,
      meta: {
        queries: result.queries,
        totalApiCalls: result.totalApiCalls,
        totalResults: result.jobs.length,
        newJobsInserted,
      },
    });
  } catch (error) {
    console.error("Job search failed:", error);
    const message =
      error instanceof Error ? error.message : "Job search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
