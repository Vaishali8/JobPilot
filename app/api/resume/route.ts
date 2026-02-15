import { NextResponse } from "next/server";

/**
 * Resume upload API route.
 * POST — Upload a PDF/DOCX resume, extract text, and store it.
 *
 * Will be fully implemented in Step 2.
 */

export async function POST() {
  // TODO: Handle file upload, parse PDF/DOCX, extract text, store in SQLite
  return NextResponse.json(
    { message: "Resume upload — not yet implemented" },
    { status: 501 }
  );
}
