/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist uses canvas which isn't available server-side
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: { browser: "./empty-module.js", default: "./empty-module.js" },
      },
    },
  },
}

export default nextConfig
