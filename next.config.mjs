/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist uses canvas which isn't available server-side
    config.resolve.alias.canvas = false
    return config
  },
  // Turbopack config (used in dev with `next dev --turbopack`)
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: "./empty-module.js",
      },
    },
  },
}

export default nextConfig
