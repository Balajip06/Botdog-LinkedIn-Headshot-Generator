import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import { CookieBanner } from '@/components/consent/CookieBanner'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

// Editorial display serif. Variable font — axes default; used for headings only.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Free AI LinkedIn Headshot Generator — Botdog',
  description:
    'Turn any selfie into a professional LinkedIn headshot in seconds. AI-powered, profession-specific styles, studio quality.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Botdog',
    statusBarStyle: 'default',
  },
}

export const viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body
        className="bg-background text-foreground flex min-h-full flex-col"
        suppressHydrationWarning
      >
        {/* Light-only brand — forcedTheme pins it regardless of OS/stored preference. */}
        <ThemeProvider attribute="class" forcedTheme="light">
          <PostHogProvider>{children}</PostHogProvider>
          <Toaster richColors position="bottom-right" />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}
