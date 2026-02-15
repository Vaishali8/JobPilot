/**
 * Shared TypeScript types for JobPilot.
 *
 * These types mirror the SQLite schema and are used throughout
 * the app — in API routes, components, and lib functions.
 */

// ─── Preferences ──────────────────────────────────────────────────

/** Allowed values for how old job postings can be */
export type PostingAge = "day" | "3days" | "week" | "month";

/** User's job search preferences (matches the preferences table) */
export interface Preferences {
  id: number;
  roles: string[]; // e.g., ["Product Manager", "Consultant"]
  employment_types: string[]; // e.g., ["Full-time", "Internship"]
  location_types: string[]; // e.g., ["Remote", "Hybrid"]
  cities: string[]; // e.g., ["Bangalore", "Mumbai"]
  posting_age: PostingAge;
  additional_preferences: string; // Free text
  resume_text: string; // Extracted text from uploaded resume
  resume_filename: string; // Original filename of uploaded resume
  updated_at: string; // ISO date string
}

/**
 * Raw preferences row from SQLite.
 * JSON arrays are stored as strings in the database,
 * so we need to parse them when reading.
 */
export interface PreferencesRow {
  id: number;
  roles: string; // JSON string: '["Product Manager"]'
  employment_types: string;
  location_types: string;
  cities: string;
  posting_age: string;
  additional_preferences: string;
  resume_text: string;
  resume_filename: string;
  updated_at: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────

/** A job listing (matches the jobs table) */
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  employment_type: string;
  posted_date: string;
  apply_link: string;
  source: string; // e.g., "LinkedIn", "Indeed", "Naukri"
  match_score: number; // 0-100, filled by Claude scoring
  match_reasoning: string; // Brief explanation of the score
  raw_data: string; // Full JSON from Serper API
  fetched_at: string;
  is_hidden: number; // 0 = visible, 1 = hidden
}

// ─── Applications ─────────────────────────────────────────────────

/** Possible application statuses */
export type ApplicationStatus =
  | "applied"
  | "interview"
  | "rejected"
  | "offer"
  | "ghosted";

/** An application tracker entry (matches the applications table) */
export interface Application {
  id: number;
  job_id: string;
  applied_at: string;
  application_mode: string; // "manual" for v1
  status: ApplicationStatus;
  notes: string;
  cover_letter: string;
  updated_at: string;
}

/** Application with joined job data for display in the tracker table */
export interface ApplicationWithJob extends Application {
  job_title: string;
  company: string;
  apply_link: string;
}

// ─── Search History ───────────────────────────────────────────────

/** A recorded search (matches the search_history table) */
export interface SearchHistoryEntry {
  id: number;
  query: string;
  results_count: number;
  searched_at: string;
}

// ─── Claude API Types ─────────────────────────────────────────────

/** The JSON response format we expect from Claude when scoring a job */
export interface JobScoreResult {
  score: number; // 0-100
  reasoning: string; // 1-2 sentence explanation
  key_matches: string[]; // Skills/experience that match
  gaps: string[]; // Missing requirements
}
