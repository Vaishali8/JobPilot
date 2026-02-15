"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Settings, LayoutDashboard, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top navigation bar for JobPilot.
 *
 * Shows the app name/logo on the left and navigation links on the right.
 * The current page is highlighted with the primary accent color.
 * Links: Preferences, Jobs (dashboard), Tracker.
 */

// Navigation items — each maps to a route in the App Router
const navItems = [
  {
    label: "Preferences",
    href: "/preferences",
    icon: Settings,
  },
  {
    label: "Jobs",
    href: "/jobs",
    icon: LayoutDashboard,
  },
  {
    label: "Tracker",
    href: "/tracker",
    icon: ClipboardList,
  },
];

export default function Navigation() {
  // usePathname() gives us the current URL path so we can highlight the active link
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / App name */}
        <Link href="/" className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            JobPilot
          </span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            // Check if the current path starts with this nav item's href
            // so that /jobs/123 also highlights the "Jobs" link
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
