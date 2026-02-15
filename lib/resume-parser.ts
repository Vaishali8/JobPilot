import pdf from "pdf-parse";

/**
 * Resume parser — extracts plain text from uploaded resume files.
 *
 * Supports:
 * - PDF files (.pdf) — uses the pdf-parse library
 *
 * The extracted text is stored in SQLite alongside preferences,
 * so it can be sent to Claude for job scoring and cover letter generation.
 */

/**
 * Extracts text content from a PDF file buffer.
 *
 * @param buffer - The raw file data as a Buffer (from the uploaded file)
 * @returns The extracted text content from the PDF
 * @throws If the PDF can't be parsed (corrupted, encrypted, etc.)
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);

  // data.text contains all the text content from the PDF, page by page
  return data.text.trim();
}

/**
 * Extracts text from a resume file based on its extension.
 *
 * @param buffer - The raw file data
 * @param filename - Original filename (used to detect file type)
 * @returns The extracted text content
 * @throws If the file type is unsupported
 */
export async function parseResume(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const extension = filename.toLowerCase().split(".").pop();

  switch (extension) {
    case "pdf":
      return extractTextFromPDF(buffer);
    default:
      throw new Error(
        `Unsupported file type: .${extension}. Please upload a PDF file.`
      );
  }
}
