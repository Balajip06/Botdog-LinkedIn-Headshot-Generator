import type { MetadataRoute } from 'next'

/**
 * PWA manifest. Powers Add-to-Home-Screen on iOS / Android and unlocks
 * iOS web push (which requires PWA-install on iOS 16.4+).
 *
 * Branded PNG icon set is on the W4 brand-assets pass; for v1 we ship the
 * SVG glyph (purpose any) which Android + Chromium render fine. iOS uses
 * the apple-touch-icon link from `app/layout.tsx` metadata.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Trendly — Trend Image Generator',
    short_name: 'Trendly',
    description:
      'Pick a viral trend. Upload your photo. Make the moment everyone is making.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#ff2e63',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['photo', 'entertainment', 'productivity'],
  }
}
