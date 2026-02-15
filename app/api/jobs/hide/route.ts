import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

/**
 * Hide job API route.
 * POST — Marks a job as hidden so it doesn't appear in the dashboard.
 * Body: { jobId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId } = (await request.json()) as { jobId: string };

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    db.prepare("UPDATE jobs SET is_hidden = 1 WHERE id = ?").run(jobId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to hide job:", error);
    return NextResponse.json(
      { error: "Failed to hide job" },
      { status: 500 }
    );
  }
}
