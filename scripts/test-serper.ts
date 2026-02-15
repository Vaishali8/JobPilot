/**
 * Test script for the Serper API integration.
 *
 * Part 1: Offline tests — validates query construction logic (no API key needed).
 * Part 2: Live API test — calls Serper with a real query (requires SERPER_API_KEY).
 *
 * Usage:
 *   npx tsx scripts/test-serper.ts              # offline tests only
 *   SERPER_API_KEY=xxx npx tsx scripts/test-serper.ts  # offline + live test
 *   (or set SERPER_API_KEY in .env.local and run with --env-file=.env.local)
 */

import { buildSearchQueries, searchJobs } from "../lib/serper";
import type { Preferences } from "../lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

function assertArrayEqual(actual: string[], expected: string[], label: string) {
  const match =
    actual.length === expected.length &&
    actual.every((v, i) => v === expected[i]);
  if (match) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

/** Creates a minimal Preferences object with overrides */
function makePrefs(overrides: Partial<Preferences> = {}): Preferences {
  return {
    id: 1,
    roles: [],
    employment_types: [],
    location_types: [],
    cities: [],
    posting_age: "week",
    additional_preferences: "",
    resume_text: "",
    resume_filename: "",
    updated_at: "",
    ...overrides,
  };
}

// ─── Part 1: Offline query construction tests ────────────────────────

console.log("\n=== Part 1: buildSearchQueries() tests ===\n");

// Test 1: Single role, single city
{
  const queries = buildSearchQueries(
    makePrefs({ roles: ["Product Manager"], cities: ["Mumbai"] })
  );
  assertArrayEqual(queries, ["Product Manager jobs in Mumbai"], "Single role + single city");
}

// Test 2: Multiple roles × multiple cities (cartesian product)
{
  const queries = buildSearchQueries(
    makePrefs({
      roles: ["Product Manager", "Business Analyst"],
      cities: ["Mumbai", "Bangalore"],
    })
  );
  assertArrayEqual(
    queries,
    [
      "Product Manager jobs in Mumbai",
      "Product Manager jobs in Bangalore",
      "Business Analyst jobs in Mumbai",
      "Business Analyst jobs in Bangalore",
    ],
    "2 roles × 2 cities = 4 queries"
  );
}

// Test 3: Role with no cities → no "in <city>" suffix
{
  const queries = buildSearchQueries(
    makePrefs({ roles: ["Data Scientist"] })
  );
  assertArrayEqual(queries, ["Data Scientist jobs"], "Role with no cities");
}

// Test 4: Role + remote location type + no cities → adds "remote"
{
  const queries = buildSearchQueries(
    makePrefs({
      roles: ["Frontend Developer"],
      location_types: ["Remote"],
    })
  );
  assertArrayEqual(
    queries,
    ["Frontend Developer jobs remote"],
    "Remote location type without city"
  );
}

// Test 5: Role + remote + city → city takes priority, no "remote" suffix
{
  const queries = buildSearchQueries(
    makePrefs({
      roles: ["Frontend Developer"],
      location_types: ["Remote"],
      cities: ["Delhi"],
    })
  );
  assertArrayEqual(
    queries,
    ["Frontend Developer jobs in Delhi"],
    "City overrides remote qualifier"
  );
}

// Test 6: Single employment type gets added
{
  const queries = buildSearchQueries(
    makePrefs({
      roles: ["Software Engineer"],
      employment_types: ["Internship"],
      cities: ["Hyderabad"],
    })
  );
  assertArrayEqual(
    queries,
    ["Software Engineer Internship jobs in Hyderabad"],
    "Single employment type added to query"
  );
}

// Test 7: Multiple employment types → not added (too noisy)
{
  const queries = buildSearchQueries(
    makePrefs({
      roles: ["Software Engineer"],
      employment_types: ["Full-time", "Contract"],
      cities: ["Pune"],
    })
  );
  assertArrayEqual(
    queries,
    ["Software Engineer jobs in Pune"],
    "Multiple employment types skipped"
  );
}

// Test 8: No roles, no cities → generic "jobs" query
{
  const queries = buildSearchQueries(makePrefs());
  assertArrayEqual(queries, ["jobs"], "Empty preferences → generic 'jobs'");
}

// Test 9: Three roles × one city
{
  const queries = buildSearchQueries(
    makePrefs({
      roles: ["PM", "Analyst", "Consultant"],
      cities: ["Chennai"],
    })
  );
  assertArrayEqual(
    queries,
    ["PM jobs in Chennai", "Analyst jobs in Chennai", "Consultant jobs in Chennai"],
    "3 roles × 1 city = 3 queries"
  );
}

// Test 10: One role × three cities
{
  const queries = buildSearchQueries(
    makePrefs({
      roles: ["Data Engineer"],
      cities: ["Mumbai", "Bangalore", "Hyderabad"],
    })
  );
  assertArrayEqual(
    queries,
    [
      "Data Engineer jobs in Mumbai",
      "Data Engineer jobs in Bangalore",
      "Data Engineer jobs in Hyderabad",
    ],
    "1 role × 3 cities = 3 queries"
  );
}

console.log(`\nOffline tests: ${passed} passed, ${failed} failed\n`);

// ─── Part 2: Live API test (requires SERPER_API_KEY) ─────────────────

async function runLiveTest() {
  console.log("=== Part 2: Live Serper API test ===\n");

  if (!process.env.SERPER_API_KEY) {
    console.log(
      "  ⏭  Skipping live test — SERPER_API_KEY not set.\n" +
        "  Set it in .env.local or pass it inline:\n" +
        "    SERPER_API_KEY=xxx npx tsx scripts/test-serper.ts\n"
    );
    return;
  }

  const prefs = makePrefs({
    roles: ["Software Engineer"],
    cities: ["Bangalore"],
    posting_age: "week",
  });

  console.log(`  Query: "${buildSearchQueries(prefs).join('", "')}"`);
  console.log("  Calling Serper API...\n");

  try {
    const result = await searchJobs(prefs);

    console.log(`  API calls made: ${result.totalApiCalls}`);
    console.log(`  Total jobs returned: ${result.jobs.length}`);
    console.log(`  Queries used: ${result.queries.join(", ")}`);

    if (result.jobs.length > 0) {
      console.log("\n  Sample results (first 3):");
      for (const job of result.jobs.slice(0, 3)) {
        console.log(`    - "${job.title}" at ${job.company || "(unknown)"}`);
        console.log(`      Location: ${job.location || "N/A"}`);
        console.log(`      Source: ${job.source || "N/A"}`);
        console.log(`      Link: ${job.apply_link || "N/A"}`);
        console.log();
      }
    }

    assert(result.totalApiCalls === 1, "Made exactly 1 API call");
    assert(result.jobs.length > 0, "Got at least 1 job result");
    assert(result.queries.length === 1, "Generated exactly 1 query");

    console.log(`\nLive tests: all checks passed\n`);
  } catch (error) {
    console.error("  ✗ Live test failed:", error);
    failed++;
  }
}

runLiveTest().then(() => {
  console.log("─────────────────────────────────────");
  console.log(`Total: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
