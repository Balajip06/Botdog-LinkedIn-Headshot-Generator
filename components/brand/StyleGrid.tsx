'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { HeadshotStyle } from '@/lib/trends/headshot'

const PAGE_SIZE = 8

interface StyleGridProps {
  styles: readonly HeadshotStyle[]
}

export function StyleGrid({ styles }: StyleGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visible = styles.slice(0, visibleCount)
  const remaining = styles.length - visibleCount

  return (
    <>
      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/?style=${s.slug}#create`}
              className="group focus-visible:ring-ring relative block aspect-[4/5] overflow-hidden rounded-2xl ring-offset-2 transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:outline-none"
              style={{ backgroundImage: `linear-gradient(135deg, ${s.accent[0]}, ${s.accent[1]})` }}
            >
              <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
                <span className="text-sm font-semibold text-white drop-shadow">{s.label}</span>
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--primary)] opacity-0 transition-opacity group-hover:opacity-100">
                  Try
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-full border border-[#0025aa]/30 px-6 py-2 text-sm font-semibold text-[#0025aa] transition-colors hover:bg-[#0025aa]/5"
          >
            Show more
          </button>
        </div>
      )}

      {remaining <= 0 && (
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Tap a style to load it into the generator above.
        </p>
      )}
    </>
  )
}
