/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist uses canvas which isn't available server-side
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
