/**
 * Shared markdown renderer for the static legal docs (/terms + /privacy).
 *
 * Both pages share the same chrome — anchor-linked headings, prose width,
 * spacing scale. Splitting this into a helper keeps each page tiny + lets
 * the underlying docs/*.md files stay the canonical edit point.
 *
 * Source files live in docs/ + are read at build time via Node's fs in the
 * RSC. We strip the trailing "Engineering notes" section (delimited by a
 * trailing markdown horizontal rule + the literal "**Engineering notes**"
 * heading) so the published page only contains user-facing copy.
 */
import { readFile } from 'fs/promises'
import path from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils/cn'

export async function loadLegalMarkdown(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'docs', filename)
  const raw = await readFile(filePath, 'utf-8')
  // Strip the trailing "Engineering notes" appendix — internal-only.
  const cutMarker = '\n**Engineering notes**'
  const cutAt = raw.indexOf(cutMarker)
  return cutAt === -1 ? raw : raw.slice(0, raw.lastIndexOf('---', cutAt)).trimEnd()
}

interface LegalArticleProps {
  markdown: string
  className?: string
}

export function LegalArticle({ markdown, className }: LegalArticleProps) {
  return (
    <article
      className={cn(
        'mx-auto max-w-3xl px-6 py-12',
        // Heading + body styling. Plain Tailwind so we don't require the
        // typography plugin; brand tokens (foreground/muted/border) carry
        // dark-mode automatically.
        '[&_h1]:mb-6 [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-tight',
        '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight',
        '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold',
        '[&_p]:my-3 [&_p]:text-foreground/85 [&_p]:leading-relaxed',
        '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ul]:text-foreground/85',
        '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_ol]:text-foreground/85',
        '[&_li]:leading-relaxed',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_em]:italic',
        '[&_a]:font-medium [&_a]:text-[var(--brand-grad-1)] [&_a]:underline-offset-2 hover:[&_a]:underline',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]',
        '[&_hr]:my-10 [&_hr]:border-border',
        '[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse',
        '[&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground',
        '[&_td]:border-b [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  )
}
