import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getDatabase } from "@/lib/db";
import { parseResume } from "@/lib/resume-parser";

/**
 * Resume upload API route.
 *
 * POST — Accepts a multipart form upload containing a PDF resume file.
 *
 * What it does:
 * 1. Reads the uploaded file from the form data
 * 2. Saves the raw file to /uploads/ (for future reference)
 * 3. Extracts text using pdf-parse
 * 4. Stores the extracted text and filename in the preferences table
 * 5. Returns the filename and extracted text length
 *
 * The file must be under 10MB and have a .pdf extension.
 */

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    // ─── Validation ─────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please upload a resume." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const filename = file.name;
    const extension = filename.toLowerCase().split(".").pop();

    if (extension !== "pdf") {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF file." },
        { status: 400 }
      );
    }

    // ─── Save file to disk ──────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), "uploads");

    // Ensure the uploads directory exists
    await mkdir(uploadsDir, { recursive: true });

    // Save with a timestamp prefix to avoid overwrites
    const savedFilename = `${Date.now()}-${filename}`;
    const filepath = path.join(uploadsDir, savedFilename);
    await writeFile(filepath, buffer);

    // ─── Extract text ───────────────────────────────────────────────
    const resumeText = await parseResume(buffer, filename);

    if (!resumeText || resumeText.length < 10) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from the PDF. The file might be image-based or empty. Try a different PDF.",
        },
        { status: 400 }
      );
    }

    // ─── Store in database ──────────────────────────────────────────
    const db = getDatabase();

    // First make sure a preferences row exists (create with defaults if not)
    db.prepare(`
      INSERT OR IGNORE INTO preferences (id) VALUES (1)
    `).run();

    // Update just the resume fields
    db.prepare(`
      UPDATE preferences
      SET resume_text = ?, resume_filename = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(resumeText, filename);

    return NextResponse.json({
      success: true,
      filename,
      textLength: resumeText.length,
      // Send back first 200 chars as a preview so the UI can confirm
      preview: resumeText.substring(0, 200) + "...",
    });
  } catch (error) {
    console.error("Resume upload failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
