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
    name: 'Botdog — AI LinkedIn Headshot Generator',
    short_name: 'Botdog',
    description: 'Turn any selfie into a professional LinkedIn headshot in seconds.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0025aa',
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
