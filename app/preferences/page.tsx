import PreferenceForm from "@/components/PreferenceForm";

/**
 * Preferences page — where the user configures their job search criteria.
 *
 * This page renders the PreferenceForm component, which handles:
 * - Loading saved preferences from SQLite on mount
 * - All form fields (roles, employment types, location types, cities,
 *   posting age, additional preferences)
 * - Resume upload with drag-and-drop
 * - Saving preferences back to SQLite
 * - "Search Jobs" button that saves and redirects to /jobs
 */
export default function PreferencesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Preferences
      </h1>
      <p className="mt-2 text-muted-foreground">
        Configure your job search criteria and upload your resume.
      </p>

      <div className="mt-8">
        <PreferenceForm />
      </div>
    </div>
  );
}
