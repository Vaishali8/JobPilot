/**
 * Serper.dev API client for fetching Google Jobs search results.
 *
 * Serper provides access to Google search results including job listings.
 * We use the dedicated /search endpoint with type=search to find jobs
 * matching the user's preferences.
 *
 * Query strategy:
 *   - One query per (role × city) combination.
 *   - If no cities are set, queries use role alone.
 *   - Results are deduplicated across queries by a composite key
 *     (company + title + location).
 *
 * API docs: https://serper.dev/
 * Rate budget: ~80 searches/day (2,500 free/month).
 */

import crypto from "crypto";
import type { Job, Preferences, PostingAge } from "./types";

// ─── Constants ───────────────────────────────────────────────────────

const SERPER_API_URL = "https://google.serper.dev/search";
const RESULTS_PER_QUERY = 10;

/** Maps our PostingAge type to the Google tbs (time-based search) parameter */
const POSTING_AGE_TO_TBS: Record<PostingAge, string> = {
  day: "qdr:d",
  "3days": "qdr:d3",
  week: "qdr:w",
  month: "qdr:m",
};

// ─── Types ───────────────────────────────────────────────────────────

/** Shape of a single organic result from the Serper API */
interface SerperOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source?: string;
  position?: number;
  sitelinks?: unknown[];
  [key: string]: unknown;
}

/** Shape of the Serper search API response */
interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
  searchParameters?: {
    q: string;
    gl?: string;
    num?: number;
    [key: string]: unknown;
  };
  jobs?: SerperJobResult[];
  [key: string]: unknown;
}

/** Shape of a job from the Serper jobs knowledgeGraph (when Google shows jobs) */
interface SerperJobResult {
  title?: string;
  companyName?: string;
  location?: string;
  date?: string;
  snippet?: string;
  link?: string;
  source?: string;
  extensions?: string[];
  [key: string]: unknown;
}

// ─── Query Construction ──────────────────────────────────────────────

/**
 * Builds an array of search query strings from user preferences.
 *
 * Strategy:
 *   roles=["PM", "Analyst"], cities=["Mumbai", "Bangalore"]
 *   → ["PM jobs in Mumbai", "PM jobs in Bangalore",
 *      "Analyst jobs in Mumbai", "Analyst jobs in Bangalore"]
 *
 *   roles=["PM"], cities=[], location_types=["Remote"]
 *   → ["PM remote jobs"]
 *
 *   roles=["PM"], cities=["Mumbai"], employment_types=["Internship"]
 *   → ["PM Internship jobs in Mumbai"]
 */
export function buildSearchQueries(prefs: Preferences): string[] {
  const queries: string[] = [];

  const roles = prefs.roles.length > 0 ? prefs.roles : [""];
  const cities = prefs.cities.length > 0 ? prefs.cities : [""];

  // Build employment type qualifier (e.g., "Internship" or "Full-time")
  // Only add if there's a single specific type to avoid overly long queries
  const employmentQualifier =
    prefs.employment_types.length === 1 ? prefs.employment_types[0] : "";

  // Build location type qualifier (e.g., "remote", "hybrid")
  const locationQualifier =
    prefs.location_types.length === 1
      ? prefs.location_types[0].toLowerCase()
      : prefs.location_types.includes("Remote")
        ? "remote"
        : "";

  for (const role of roles) {
    for (const city of cities) {
      const parts: string[] = [];

      if (role) parts.push(role);
      if (employmentQualifier) parts.push(employmentQualifier);

      parts.push("jobs");

      if (locationQualifier && !city) {
        // Only add "remote" etc. when there's no specific city
        parts.push(locationQualifier);
      }

      if (city) {
        parts.push("in", city);
      }

      queries.push(parts.join(" "));
    }
  }

  return queries;
}

// ─── ID Generation ───────────────────────────────────────────────────

/**
 * Generates a stable, unique ID for a job from its key fields.
 * This ensures we don't insert duplicates across multiple searches.
 */
function generateJobId(title: string, company: string, location: string): string {
  const raw = `${title}|${company}|${location}`.toLowerCase().trim();
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

// ─── API Call ────────────────────────────────────────────────────────

/**
 * Calls the Serper search API for a single query string.
 * Returns the raw API response.
 */
async function callSerperAPI(
  query: string,
  postingAge: PostingAge,
  apiKey: string
): Promise<SerperSearchResponse> {
  const body: Record<string, unknown> = {
    q: query,
    num: RESULTS_PER_QUERY,
  };

  // Add time filter
  const tbs = POSTING_AGE_TO_TBS[postingAge];
  if (tbs) {
    body.tbs = tbs;
  }

  const response = await fetch(SERPER_API_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Serper API error ${response.status}: ${text}`
    );
  }

  return response.json() as Promise<SerperSearchResponse>;
}

// ─── Result Mapping ──────────────────────────────────────────────────

/**
 * Extracts job-relevant data from Serper organic search results.
 * Organic results from a "jobs" query often contain job board listings.
 */
function mapOrganicToJobs(
  results: SerperOrganicResult[],
  query: string
): Job[] {
  return results.map((r) => {
    const title = r.title || "Untitled";
    const company = extractCompany(r);
    const location = extractLocation(r, query);

    return {
      id: generateJobId(title, company, location),
      title,
      company,
      location,
      description: r.snippet || "",
      employment_type: "",
      posted_date: r.date || "",
      apply_link: r.link || "",
      source: r.source || extractSourceFromUrl(r.link || ""),
      match_score: 0,
      match_reasoning: "",
      raw_data: JSON.stringify(r),
      fetched_at: new Date().toISOString(),
      is_hidden: 0,
    };
  });
}

/**
 * Maps Serper jobs knowledgeGraph results (when Google shows the jobs panel)
 * to our Job type.
 */
function mapSerperJobsToJobs(results: SerperJobResult[]): Job[] {
  return results.map((r) => {
    const title = r.title || "Untitled";
    const company = r.companyName || "";
    const location = r.location || "";

    return {
      id: generateJobId(title, company, location),
      title,
      company,
      location,
      description: r.snippet || "",
      employment_type: r.extensions?.join(", ") || "",
      posted_date: r.date || "",
      apply_link: r.link || "",
      source: r.source || "",
      match_score: 0,
      match_reasoning: "",
      raw_data: JSON.stringify(r),
      fetched_at: new Date().toISOString(),
      is_hidden: 0,
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Attempts to extract a company name from an organic result */
function extractCompany(result: SerperOrganicResult): string {
  // Serper organic results sometimes have the source as the company
  // e.g., source: "LinkedIn" isn't helpful, but sometimes it's "Google Careers"
  // Best effort: parse from the title if it follows "Role - Company" or "Role at Company"
  const title = result.title || "";
  const atMatch = title.match(/\bat\s+(.+?)(?:\s*[-|]|$)/i);
  if (atMatch) return atMatch[1].trim();

  const dashMatch = title.match(/\s[-–—|]\s+(.+?)(?:\s*[-|]|$)/);
  if (dashMatch) return dashMatch[1].trim();

  return result.source || "";
}

/** Tries to extract location from a result, falling back to the search query city */
function extractLocation(
  result: SerperOrganicResult,
  query: string
): string {
  // Check the snippet for common location patterns
  const snippet = result.snippet || "";
  const locMatch = snippet.match(
    /(?:Location|Based in|Office in)[:\s]+([^.;,]+)/i
  );
  if (locMatch) return locMatch[1].trim();

  // Fall back to city from the query (e.g., "PM jobs in Mumbai" → "Mumbai")
  const inMatch = query.match(/\bin\s+(.+)$/i);
  if (inMatch) return inMatch[1].trim();

  return "";
}

/** Extracts a human-readable source name from a URL */
function extractSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const knownSources: Record<string, string> = {
      "linkedin.com": "LinkedIn",
      "indeed.com": "Indeed",
      "naukri.com": "Naukri",
      "glassdoor.com": "Glassdoor",
      "monster.com": "Monster",
      "google.com": "Google Jobs",
      "lever.co": "Lever",
      "greenhouse.io": "Greenhouse",
      "workday.com": "Workday",
      "angel.co": "AngelList",
      "wellfound.com": "Wellfound",
      "careers-page.com": "Careers Page",
    };
    return knownSources[hostname] || hostname;
  } catch {
    return "";
  }
}

// ─── Main Export ─────────────────────────────────────────────────────

/** Result returned by searchJobs */
export interface SearchResult {
  jobs: Job[];
  queries: string[];
  totalApiCalls: number;
}

/**
 * Main entry point: searches for jobs using the Serper API based on preferences.
 *
 * 1. Builds query strings from preferences (role × city combos).
 * 2. Calls Serper for each query (sequentially to stay under rate limits).
 * 3. Maps and deduplicates results.
 * 4. Returns jobs + metadata.
 */
export async function searchJobs(prefs: Preferences): Promise<SearchResult> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SERPER_API_KEY is not set. Add it to .env.local"
    );
  }

  const queries = buildSearchQueries(prefs);
  if (queries.length === 0) {
    return { jobs: [], queries: [], totalApiCalls: 0 };
  }

  const allJobs: Job[] = [];
  const seenIds = new Set<string>();
  let totalApiCalls = 0;

  for (const query of queries) {
    try {
      const data = await callSerperAPI(query, prefs.posting_age, apiKey);
      totalApiCalls++;

      // Prefer the structured jobs array if Google returned one
      let jobs: Job[] = [];
      if (data.jobs && data.jobs.length > 0) {
        jobs = mapSerperJobsToJobs(data.jobs);
      } else if (data.organic && data.organic.length > 0) {
        jobs = mapOrganicToJobs(data.organic, query);
      }

      // Deduplicate
      for (const job of jobs) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          allJobs.push(job);
        }
      }
    } catch (error) {
      // Log but don't abort — partial results are still useful
      console.error(`Serper query failed for "${query}":`, error);
    }
  }

  return { jobs: allJobs, queries, totalApiCalls };
}
