import { NextResponse } from "next/server";

/**
 * Application tracker API route.
 * GET   — List all tracked applications.
 * POST  — Add a new application entry.
 * PATCH — Update an existing application (status, notes, etc.).
 *
 * Will be fully implemented in Step 6.
 */

export async function GET() {
  // TODO: Fetch all applications with joined job data from SQLite
  return NextResponse.json(
    { message: "Tracker GET — not yet implemented" },
    { status: 501 }
  );
}

export async function POST() {
  // TODO: Create a new application entry in SQLite
  return NextResponse.json(
    { message: "Tracker POST — not yet implemented" },
    { status: 501 }
  );
}

export async function PATCH() {
  // TODO: Update an application's status, notes, or cover letter
  return NextResponse.json(
    { message: "Tracker PATCH — not yet implemented" },
    { status: 501 }
  );
}
