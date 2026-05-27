import { ImageResponse } from 'next/og'
import { getActiveTrendBySlug } from '@/lib/trends/repository'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Trend Image Generator'

interface OgProps {
  params: Promise<{ slug: string }>
}

export default async function OpengraphImage({ params }: OgProps) {
  const { slug } = await params
  const trend = await getActiveTrendBySlug(slug)
  const title = trend?.title ?? 'Trend Image Generator'
  const description = trend?.description ?? 'Viral image trends with your photo.'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.7 }}>Trend Image Generator</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 28, opacity: 0.8, lineHeight: 1.3 }}>{description}</div>
        </div>
      </div>
    ),
    size
  )
}
