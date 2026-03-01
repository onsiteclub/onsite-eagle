/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@onsite/supabase',
    '@onsite/utils',
    '@onsite/auth',
    '@onsite/shared',
    '@onsite/framing',
    '@onsite/ui',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
