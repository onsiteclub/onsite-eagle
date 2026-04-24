/** @type {import('next').NextConfig} */

// Dual-target config:
//   - Default (`next build`)              → SSR for Vercel / PWA
//   - `BUILD_TARGET=capacitor next build` → static export for mobile APK
// See scripts/build-capacitor.mjs — the native build shelves API routes,
// middleware, and dynamic [param] segments before invoking next build.
const isCapacitor = process.env.BUILD_TARGET === 'capacitor'

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@onsite/supabase',
    '@onsite/export',
    '@onsite/tokens',
  ],
  images: {
    ...(isCapacitor ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  ...(isCapacitor
    ? {
        output: 'export',
        trailingSlash: true,
      }
    : {}),
}

module.exports = nextConfig
