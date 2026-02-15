import Database from "better-sqlite3";
import path from "path";

/**
 * SQLite database setup and initialization for JobPilot.
 *
 * The database file lives at /data/jobpilot.db (relative to the project root).
 * It's auto-created on first access. All tables use "CREATE TABLE IF NOT EXISTS"
 * so it's safe to call initializeDatabase() multiple times.
 *
 * We use better-sqlite3 because it's synchronous (simpler code), fast,
 * and perfect for a single-user personal app.
 */

// Path to the SQLite database file
const DB_PATH = path.join(process.cwd(), "data", "jobpilot.db");

// Singleton database instance so we don't open multiple connections
let db: Database.Database | null = null;

/**
 * Returns the database instance, creating it if it doesn't exist yet.
 * Also ensures all tables are created on first run.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);

    // Enable WAL mode for better concurrent read performance
    db.pragma("journal_mode = WAL");

    // Initialize all tables
    initializeDatabase(db);
  }
  return db;
}

/**
 * Creates all tables needed by JobPilot.
 * Uses "IF NOT EXISTS" so this is safe to call repeatedly.
 */
function initializeDatabase(database: Database.Database): void {
  // ─── Preferences table ───────────────────────────────────────────
  // Single row for personal use. Stores user's job search preferences.
  // JSON arrays are stored as TEXT (SQLite doesn't have a native JSON type,
  // but it's fine — we parse them in TypeScript).
  database.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      id INTEGER PRIMARY KEY DEFAULT 1,
      roles TEXT NOT NULL DEFAULT '[]',
      employment_types TEXT NOT NULL DEFAULT '[]',
      location_types TEXT NOT NULL DEFAULT '[]',
      cities TEXT NOT NULL DEFAULT '[]',
      posting_age TEXT NOT NULL DEFAULT 'week',
      additional_preferences TEXT DEFAULT '',
      resume_text TEXT DEFAULT '',
      resume_filename TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─── Jobs table ──────────────────────────────────────────────────
  // Cached job listings fetched from the Serper API.
  // match_score and match_reasoning are filled in by the Claude scoring step.
  database.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT DEFAULT '',
      description TEXT DEFAULT '',
      employment_type TEXT DEFAULT '',
      posted_date TEXT DEFAULT '',
      apply_link TEXT DEFAULT '',
      source TEXT DEFAULT '',
      match_score INTEGER DEFAULT 0,
      match_reasoning TEXT DEFAULT '',
      raw_data TEXT DEFAULT '{}',
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_hidden INTEGER DEFAULT 0
    );
  `);

  // ─── Applications table ──────────────────────────────────────────
  // Tracks jobs the user has applied to, with status and notes.
  database.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT REFERENCES jobs(id),
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      application_mode TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'applied',
      notes TEXT DEFAULT '',
      cover_letter TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─── Search history table ────────────────────────────────────────
  // Records past searches to help avoid duplicate API calls.
  database.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      results_count INTEGER DEFAULT 0,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Closes the database connection.
 * Call this during graceful shutdown if needed.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
