import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@onsite/shared', '@onsite/ui'],
};

export default nextConfig;
