import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@onsite/shared', '@onsite/ui', '@onsite/auth', '@onsite/auth-ui'],
};

export default nextConfig;
