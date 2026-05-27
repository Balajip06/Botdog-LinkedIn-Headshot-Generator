import type { MetadataRoute } from 'next'
import { listActiveTrends } from '@/lib/trends/repository'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const trends = await listActiveTrends()

  const trendEntries: MetadataRoute.Sitemap = trends.map((t) => ({
    url: `${siteUrl}/trend/${t.slug}`,
    lastModified: new Date(t.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...trendEntries,
  ]
}
