import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  eslint: { dirs: ["src", "scripts", "tests", "e2e"] },
  env: { NEXT_PUBLIC_STORAGE_MODE: process.env.STORAGE_MODE || (process.env.VERCEL ? "browser" : "sqlite") },
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] }];
  },
};
export default nextConfig;
