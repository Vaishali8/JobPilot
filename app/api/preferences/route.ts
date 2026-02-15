import { NextResponse } from "next/server";

/**
 * Preferences API route.
 * GET  — Load saved preferences from SQLite.
 * POST — Save updated preferences to SQLite.
 *
 * Will be fully implemented in Step 2.
 */

export async function GET() {
  // TODO: Load preferences from SQLite
  return NextResponse.json(
    { message: "Preferences GET — not yet implemented" },
    { status: 501 }
  );
}

export async function POST() {
  // TODO: Save preferences to SQLite
  return NextResponse.json(
    { message: "Preferences POST — not yet implemented" },
    { status: 501 }
  );
}
