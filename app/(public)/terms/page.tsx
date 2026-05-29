import type { Metadata } from 'next'
import { LegalArticle, loadLegalMarkdown } from '../_legal/renderDoc'

export const metadata: Metadata = {
  title: 'Terms of Service — Trendly',
  description: 'Personal-use license, prohibited content, style-reference takedown protocol, and AI-quality disclaimer for the Trendly trend image generator.',
  robots: { index: true, follow: true },
}

export const revalidate = 3600

export default async function TermsPage() {
  const markdown = await loadLegalMarkdown('TERMS_OF_SERVICE.md')
  return <LegalArticle markdown={markdown} />
}
