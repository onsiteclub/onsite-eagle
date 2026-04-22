/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  transpilePackages: [
    '@onsite/supabase',
    '@onsite/auth',
    '@onsite/auth-ui',
    '@onsite/framing',
    '@onsite/export',
    '@onsite/tokens',
  ],
  images: {
    unoptimized: true,
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
