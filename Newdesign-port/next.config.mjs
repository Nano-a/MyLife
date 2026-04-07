/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mylife/core'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
