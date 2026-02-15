"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Search, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import TagInput from "@/components/TagInput";
import ResumeUpload from "@/components/ResumeUpload";
import type { Preferences, PostingAge } from "@/lib/types";

/**
 * PreferenceForm — the main form on the /preferences page.
 *
 * This form lets the user configure their job search criteria:
 * - Roles (tag input with suggestions)
 * - Employment types (checkbox group)
 * - Location types (checkbox group)
 * - Cities (tag input with Indian city suggestions)
 * - Posting age (radio group)
 * - Additional preferences (free text)
 * - Resume upload (drag-and-drop, handled by ResumeUpload component)
 *
 * On mount, it loads saved preferences from /api/preferences.
 * On save, it POSTs the form data back to the same endpoint.
 */

// ─── Constants ──────────────────────────────────────────────────────

/** Suggested roles — shown in the tag input dropdown */
const ROLE_SUGGESTIONS = [
  "Product Manager",
  "Software Engineer",
  "Data Analyst",
  "Business Analyst",
  "Consultant",
  "UX Designer",
  "Data Scientist",
  "Project Manager",
  "Marketing Manager",
  "Operations Manager",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "QA Engineer",
];

/** Employment type options — shown as checkboxes */
const EMPLOYMENT_TYPES = ["Full-time", "Internship", "Part-time", "Contract"];

/** Location type options — shown as checkboxes */
const LOCATION_TYPES = ["Remote", "Hybrid", "On-site"];

/** Major Indian cities — shown in the cities tag input dropdown */
const INDIAN_CITIES = [
  "Bangalore",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Gurgaon",
  "Noida",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
];

/** Posting age options — shown as radio buttons */
const POSTING_AGE_OPTIONS: { value: PostingAge; label: string }[] = [
  { value: "day", label: "Past 24 hours" },
  { value: "3days", label: "Past 3 days" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

export default function PreferenceForm() {
  // ─── Form state ─────────────────────────────────────────────────
  const [roles, setRoles] = useState<string[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [locationTypes, setLocationTypes] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [postingAge, setPostingAge] = useState<PostingAge>("week");
  const [additionalPreferences, setAdditionalPreferences] = useState("");
  const [resumeFilename, setResumeFilename] = useState("");

  // ─── UI state ───────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  // ─── Load saved preferences on mount ────────────────────────────
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch("/api/preferences");
        if (response.ok) {
          const data: Preferences = await response.json();
          setRoles(data.roles);
          setEmploymentTypes(data.employment_types);
          setLocationTypes(data.location_types);
          setCities(data.cities);
          setPostingAge(data.posting_age);
          setAdditionalPreferences(data.additional_preferences);
          setResumeFilename(data.resume_filename);
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, []);

  // ─── Save preferences ──────────────────────────────────────────

  const savePreferences = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles,
          employment_types: employmentTypes,
          location_types: locationTypes,
          cities,
          posting_age: postingAge,
          additional_preferences: additionalPreferences,
        }),
      });

      if (response.ok) {
        setSaveStatus("saved");
        // Clear the "Saved!" indicator after 3 seconds
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [roles, employmentTypes, locationTypes, cities, postingAge, additionalPreferences]);

  // ─── Checkbox toggle helper ────────────────────────────────────

  const toggleCheckbox = useCallback(
    (
      value: string,
      current: string[],
      setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
      if (current.includes(value)) {
        setter(current.filter((v) => v !== value));
      } else {
        setter([...current, value]);
      }
    },
    []
  );

  // ─── Resume upload callback ─────────────────────────────────────

  const handleResumeUpload = useCallback((filename: string) => {
    setResumeFilename(filename);
  }, []);

  // ─── Handle form submission ─────────────────────────────────────

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      savePreferences();
    },
    [savePreferences]
  );

  // ─── Search Jobs handler (save + redirect) ─────────────────────

  const handleSearchJobs = useCallback(async () => {
    await savePreferences();
    // Redirect to jobs page — the jobs page will trigger the search
    window.location.href = "/jobs";
  }, [savePreferences]);

  // Show loading skeleton while preferences load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading preferences...
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ─── Roles ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="roles">Roles</Label>
        <p className="text-xs text-muted-foreground">
          What job titles are you looking for? Type and press Enter to add.
        </p>
        <TagInput
          value={roles}
          onChange={setRoles}
          suggestions={ROLE_SUGGESTIONS}
          placeholder="e.g., Product Manager, Software Engineer..."
        />
      </div>

      {/* ─── Employment Type ───────────────────────────────────────── */}
      <div className="space-y-3">
        <Label>Employment Type</Label>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {EMPLOYMENT_TYPES.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={employmentTypes.includes(type)}
                onCheckedChange={() =>
                  toggleCheckbox(type, employmentTypes, setEmploymentTypes)
                }
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* ─── Location Type ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label>Location Type</Label>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {LOCATION_TYPES.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={locationTypes.includes(type)}
                onCheckedChange={() =>
                  toggleCheckbox(type, locationTypes, setLocationTypes)
                }
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* ─── Cities ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="cities">Cities</Label>
        <p className="text-xs text-muted-foreground">
          For on-site or hybrid roles — which cities work for you?
        </p>
        <TagInput
          value={cities}
          onChange={setCities}
          suggestions={INDIAN_CITIES}
          placeholder="e.g., Bangalore, Mumbai..."
        />
      </div>

      {/* ─── Posting Age ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label>Job Posting Age</Label>
        <p className="text-xs text-muted-foreground">
          How recent should the job postings be?
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {POSTING_AGE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="posting_age"
                value={option.value}
                checked={postingAge === option.value}
                onChange={() => setPostingAge(option.value)}
                className="h-4 w-4 border-input text-primary accent-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* ─── Additional Preferences ────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="additional_preferences">Additional Preferences</Label>
        <Textarea
          id="additional_preferences"
          value={additionalPreferences}
          onChange={(e) => setAdditionalPreferences(e.target.value)}
          placeholder="e.g., I have a 90-day notice period, prefer startups, looking for Series B+ companies..."
          rows={3}
        />
      </div>

      {/* ─── Resume Upload ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Resume</Label>
        <p className="text-xs text-muted-foreground">
          Upload your resume so we can score jobs against your skills and
          experience.
        </p>
        <ResumeUpload
          currentFilename={resumeFilename}
          onUploadComplete={handleResumeUpload}
        />
      </div>

      {/* ─── Action Buttons ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button
          type="submit"
          disabled={isSaving}
          variant="outline"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveStatus === "saved" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveStatus === "saved" ? "Saved!" : "Save Preferences"}
        </Button>

        <Button
          type="button"
          onClick={handleSearchJobs}
          disabled={isSaving || roles.length === 0}
        >
          <Search className="h-4 w-4" />
          Search Jobs
        </Button>

        {saveStatus === "error" && (
          <span className="text-sm text-destructive">
            Failed to save. Please try again.
          </span>
        )}

        {roles.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Add at least one role to search for jobs.
          </span>
        )}
      </div>
    </form>
  );
}
