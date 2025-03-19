/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      "canvas-prebuilt": false,
    }
    return config
  }
}

module.exports = nextConfig 