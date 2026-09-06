import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chorify/core', '@chorify/db', '@chorify/local-db'],
  // Native/binary modules must stay out of the webpack bundle (D80).
  serverExternalPackages: ['@node-rs/argon2', 'better-sqlite3', 'pg'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals ?? [];
      (config.externals as unknown[]).push({ '@node-rs/argon2': 'commonjs @node-rs/argon2' });
    }
    return config;
  },
};

export default nextConfig;
