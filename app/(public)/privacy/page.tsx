import type { Metadata } from 'next'
import { LegalArticle, loadLegalMarkdown } from '../_legal/renderDoc'

export const metadata: Metadata = {
  title: 'Privacy Policy — Botdog',
  description:
    'What we collect, how we use it, retention windows, your GDPR + CCPA rights, and how to export or delete your data.',
  robots: { index: true, follow: true },
}

export const revalidate = 3600

export default async function PrivacyPage() {
  const markdown = await loadLegalMarkdown('PRIVACY_POLICY.md')
  return <LegalArticle markdown={markdown} />
}
