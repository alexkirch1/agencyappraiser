/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist requires canvas on the server — stub it out for both bundlers
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.mjs",
    },
  },
}

export default nextConfig
