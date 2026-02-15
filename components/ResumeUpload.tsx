"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ResumeUpload — drag-and-drop file upload component for resumes.
 *
 * Features:
 * - Drag-and-drop zone with visual feedback
 * - Click-to-browse fallback
 * - Accepts .pdf files only
 * - Shows upload progress and extracted text preview
 * - Calls /api/resume to parse and store the file
 *
 * Props:
 * - currentFilename: The filename of the previously uploaded resume (if any)
 * - onUploadComplete: Callback when the resume is successfully uploaded
 */

interface ResumeUploadProps {
  currentFilename: string;
  onUploadComplete: (filename: string) => void;
}

export default function ResumeUpload({
  currentFilename,
  onUploadComplete,
}: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState(currentFilename);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle the actual file upload to our API
  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("resume", file);

        const response = await fetch("/api/resume", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Upload failed");
          return;
        }

        // Upload succeeded — update the displayed filename
        setUploadedFilename(data.filename);
        onUploadComplete(data.filename);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  // Validate the file before uploading
  const handleFile = useCallback(
    (file: File) => {
      // Check file type
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file.");
        return;
      }

      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError("File is too large. Maximum size is 10MB.");
        return;
      }

      uploadFile(file);
    },
    [uploadFile]
  );

  // ─── Drag & drop event handlers ──────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  // ─── Click-to-browse handler ─────────────────────────────────────

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset the input so the same file can be re-uploaded
      e.target.value = "";
    },
    [handleFile]
  );

  // ─── Remove resume handler ───────────────────────────────────────

  const handleRemove = useCallback(() => {
    setUploadedFilename("");
    setError(null);
    onUploadComplete("");
  }, [onUploadComplete]);

  return (
    <div className="space-y-2">
      {/* If a resume is already uploaded, show the filename with a remove button */}
      {uploadedFilename && !isUploading ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          <span className="flex-1 truncate text-sm font-medium">
            {uploadedFilename}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-7 w-7 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* Drag-and-drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Uploading and parsing resume...
            </p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {uploadedFilename
                  ? "Drop a new resume to replace"
                  : "Drop your resume here, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF files up to 10MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input for click-to-browse */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
