import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js addon (C++ compiled).
  // It must be excluded from webpack bundling — it only runs server-side.
  // serverExternalPackages tells Next.js to leave these as Node require() calls.
  serverExternalPackages: ["better-sqlite3", "pdf-parse"],
};

export default nextConfig;
