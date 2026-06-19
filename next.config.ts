import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  // Suppress HMR client-side overlay noise in development
  devIndicators: false,
}

export default nextConfig
