import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chorify/core', '@chorify/db', '@chorify/local-db'],
};

export default nextConfig;
