import { NextResponse } from "next/server";

/**
 * Job scoring API route.
 * POST — Score job listings against the user's resume using Claude Haiku.
 *
 * Will be fully implemented in Step 5.
 */

export async function POST() {
  // TODO: Send jobs + resume to Claude Haiku for scoring, store scores in SQLite
  return NextResponse.json(
    { message: "Job scoring — not yet implemented" },
    { status: 501 }
  );
}
