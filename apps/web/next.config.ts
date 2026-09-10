import type { NextConfig } from 'next';

/**
 * CSP baseline (§8: the accepted Bearer-token XSS tradeoff, D36, is mitigated
 * by exactly this header among others). Policy notes:
 * - 'unsafe-inline' on script-src covers the tiny theme boot script in the
 *   root layout (FOUC guard); a nonce for one static string is ceremony we
 *   skip deliberately. 'unsafe-eval' is dev-only (Next HMR).
 * - 'unsafe-inline' on style-src covers Next/React inline style attributes.
 * - Fonts are self-hosted via next/font (same-origin /_next/static/media).
 * - connect-src stays 'self': the API and the sync engine are same-origin;
 *   'self' also matches same-origin ws: for Next dev HMR.
 */
const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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
