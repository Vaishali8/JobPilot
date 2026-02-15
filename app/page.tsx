import Link from "next/link";
import { Settings, LayoutDashboard, ClipboardList } from "lucide-react";

/**
 * Home page — serves as a landing/welcome page.
 * Provides quick links to the three main sections of JobPilot.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Welcome to JobPilot
      </h1>
      <p className="mt-4 max-w-lg text-center text-lg text-muted-foreground">
        Your personal job search dashboard. Aggregate listings, score them
        against your resume, and track your applications — all in one place.
      </p>

      {/* Quick-start cards */}
      <div className="mt-12 grid w-full max-w-3xl gap-6 sm:grid-cols-3">
        <Link
          href="/preferences"
          className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <Settings className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
          <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Set your roles, locations, and upload your resume.
          </p>
        </Link>

        <Link
          href="/jobs"
          className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <LayoutDashboard className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
          <h2 className="text-lg font-semibold text-foreground">Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Browse and score job listings matched to your profile.
          </p>
        </Link>

        <Link
          href="/tracker"
          className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <ClipboardList className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
          <h2 className="text-lg font-semibold text-foreground">Tracker</h2>
          <p className="text-sm text-muted-foreground">
            Track your applications and monitor their status.
          </p>
        </Link>
      </div>
    </div>
  );
}
