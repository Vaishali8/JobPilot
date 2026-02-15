import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import "./globals.css";

/**
 * Root layout for JobPilot.
 *
 * This wraps every page in the app. It provides:
 * - The top navigation bar (shown on every page)
 * - A max-width content container with padding
 *
 * Font setup:
 * The fonts (Plus Jakarta Sans, system mono) are configured via CSS custom
 * properties in globals.css. The font-sans Tailwind utility maps to
 * --font-sans, which references the Plus Jakarta Sans font family.
 * When running locally with internet access, Next.js Google Fonts can be
 * added back for self-hosted font optimization.
 */

export const metadata: Metadata = {
  title: "JobPilot — Personal Job Search Dashboard",
  description:
    "Aggregate job listings, score them against your resume, and track applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* Top navigation bar — shown on every page */}
        <Navigation />

        {/* Main content area with max-width and padding */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
