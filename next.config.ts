import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Generation outputs + user uploads live on Supabase Storage. Admin-entered
    // trend thumbnails (TrendForm) accept arbitrary HTTPS URLs from any CDN
    // (Unsplash, Imgix, marketing assets, etc.), so we wildcard https hosts.
    //
    // Tradeoff: wildcard hosts = max flexibility for the admin tool at the cost
    // of an open optimizer surface. Mitigated by (a) only admins can set those
    // URLs, (b) optimizer enforces its own SSRF guards, and (c) all admin
    // mutations are audit-logged. Tighten to an allowlist if we ever stop
    // trusting the admin role.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/sign/**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

const sentryEnabled =
  !!process.env.SENTRY_DSN && !!process.env.SENTRY_AUTH_TOKEN && process.env.NODE_ENV === 'production'

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig
