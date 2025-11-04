/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@elastic/elasticsearch']
  },
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution for Render deployment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  }
}

module.exports = nextConfig
