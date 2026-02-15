import { NextResponse } from "next/server";

/**
 * Cover letter generation API route.
 * POST — Generate a tailored cover letter using Claude Sonnet.
 *
 * Will be fully implemented in Step 7.
 */

export async function POST() {
  // TODO: Send resume + job description to Claude Sonnet, return generated cover letter
  return NextResponse.json(
    { message: "Cover letter generation — not yet implemented" },
    { status: 501 }
  );
}
