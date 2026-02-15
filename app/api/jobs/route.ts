import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import type { Job } from "@/lib/types";

/**
 * Jobs list API route.
 * GET — Returns all non-hidden jobs from the database, newest first.
 */
export async function GET() {
  try {
    const db = getDatabase();
    const jobs = db
      .prepare(
        "SELECT * FROM jobs WHERE is_hidden = 0 ORDER BY fetched_at DESC"
      )
      .all() as Job[];

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
