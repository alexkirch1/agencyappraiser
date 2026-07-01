import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  // Suppress HMR client-side overlay noise in development
  devIndicators: false,
  // Inline CSS into DOM snapshots so Microsoft Clarity session replays
  // can render styles even when hashed production CSS URLs are unavailable.
  // Only enabled in production — inlineCss + Turbopack dev creates phantom
  // [__metadata_id__] sub-routes that cause API routes to 500 in development.
  experimental: {
    inlineCss: process.env.NODE_ENV === "production",
  },
}

export default nextConfig
