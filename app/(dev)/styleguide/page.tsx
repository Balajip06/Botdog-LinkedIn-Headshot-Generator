import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

/**
 * Dev-only styleguide. The actual body (which imports every shadcn primitive,
 * brand component, design token, motion utility, and brand surface) lives in
 * StyleguideBody.tsx and is dynamic-imported so it never enters the production
 * client bundle. In production builds, this page short-circuits to notFound()
 * BEFORE the dynamic import fires, so the StyleguideBody chunk is created but
 * never fetched by any user.
 *
 * Net effect: /styleguide drops from ~940 KB First Load JS to a few KB in prod.
 */
const StyleguideBody = dynamic(() => import('./StyleguideBody'))

export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <StyleguideBody />
}
