import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import type { Preferences, PreferencesRow } from "@/lib/types";

/**
 * Preferences API route.
 *
 * GET  — Load saved preferences from SQLite.
 *        Returns the single preferences row (parsed from JSON strings).
 *        If no preferences exist yet, returns defaults.
 *
 * POST — Save updated preferences to SQLite.
 *        Expects a JSON body matching the Preferences interface
 *        (with arrays for roles, employment_types, etc.).
 *        Uses INSERT OR REPLACE so it always writes to row id=1.
 */

/**
 * Converts a raw SQLite row (JSON strings) into a typed Preferences object.
 * The database stores arrays as JSON strings — this parses them back.
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

/** Default preferences for a brand-new user */
const DEFAULT_PREFERENCES: Preferences = {
  id: 1,
  roles: [],
  employment_types: [],
  location_types: [],
  cities: [],
  posting_age: "week",
  additional_preferences: "",
  resume_text: "",
  resume_filename: "",
  updated_at: new Date().toISOString(),
};

export async function GET() {
  try {
    const db = getDatabase();

    // Fetch the single preferences row (id=1)
    const row = db
      .prepare("SELECT * FROM preferences WHERE id = 1")
      .get() as PreferencesRow | undefined;

    if (!row) {
      // No preferences saved yet — return defaults
      return NextResponse.json(DEFAULT_PREFERENCES);
    }

    return NextResponse.json(parsePreferencesRow(row));
  } catch (error) {
    console.error("Failed to load preferences:", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDatabase();

    // Validate that required fields are present
    const {
      roles = [],
      employment_types = [],
      location_types = [],
      cities = [],
      posting_age = "week",
      additional_preferences = "",
    } = body;

    // INSERT OR REPLACE: if row id=1 exists, it updates; otherwise it creates.
    // We serialize arrays to JSON strings for SQLite storage.
    // resume_text and resume_filename are NOT updated here — they're set
    // by the /api/resume upload route separately.
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO preferences (
        id, roles, employment_types, location_types, cities,
        posting_age, additional_preferences,
        resume_text, resume_filename, updated_at
      ) VALUES (
        1, ?, ?, ?, ?,
        ?, ?,
        COALESCE((SELECT resume_text FROM preferences WHERE id = 1), ''),
        COALESCE((SELECT resume_filename FROM preferences WHERE id = 1), ''),
        CURRENT_TIMESTAMP
      )
    `);

    stmt.run(
      JSON.stringify(roles),
      JSON.stringify(employment_types),
      JSON.stringify(location_types),
      JSON.stringify(cities),
      posting_age,
      additional_preferences
    );

    // Read back the saved row to return the full state
    const saved = db
      .prepare("SELECT * FROM preferences WHERE id = 1")
      .get() as PreferencesRow;

    return NextResponse.json(parsePreferencesRow(saved));
  } catch (error) {
    console.error("Failed to save preferences:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
