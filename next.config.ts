import withBundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const bundleAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

// Defense-in-depth response headers. CSP is intentionally omitted until the
// Stripe + Turnstile + Google OAuth iframe origins are live and verified —
// shipping a too-strict policy now would break working features. The headers
// below are safe to ship without third-party coordination.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route. Static assets opt out via _next/static caching
        // headers Next emits separately; these don't conflict.
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
  images: {
    // Allowlist only the hosts we actually serve images from. Avoids turning
    // /_next/image into an open proxy (SSRF risk against internal metadata
    // endpoints if a wildcard is left in). Adding a new CDN means updating
    // this list explicitly + redeploying.
    //
    // - *.supabase.co/storage/v1/object/{public,sign}/** — generation outputs,
    //   user uploads, admin-entered thumbnails that we host ourselves.
    // - images.unsplash.com — most common admin thumbnail source.
    // - cdn.imgix.net — second-most-common.
    // Add more hosts here as admin needs them. If an admin tries to set a
    // thumbnail from an unsupported host, next/image returns 400 — that's
    // the desired fail-loud behavior.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/sign/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.imgix.net', pathname: '/**' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

const sentryEnabled =
  !!process.env.SENTRY_DSN && !!process.env.SENTRY_AUTH_TOKEN && process.env.NODE_ENV === 'production'

export default sentryEnabled
  ? withSentryConfig(bundleAnalyzer(nextConfig), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : bundleAnalyzer(nextConfig)
