import { NextResponse } from "next/server";

/**
 * Job search API route.
 * POST — Fetch job listings from Serper API based on saved preferences.
 *
 * Will be fully implemented in Step 3.
 */

export async function POST() {
  // TODO: Build search queries from preferences, call Serper, store results
  return NextResponse.json(
    { message: "Job search — not yet implemented" },
    { status: 501 }
  );
}
