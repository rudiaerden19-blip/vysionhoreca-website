'use client'

import Link from 'next/link'

interface DemoBannerProps {
  tenantSlug: string
}

/**
 * Banner die toont dat de bezoeker in demo mode zit.
 * Alle acties zijn uitgeschakeld - alleen kijken.
 */
export function DemoBanner({ tenantSlug }: DemoBannerProps) {
  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 text-center sticky top-0 z-50 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">👀</span>
          <span className="font-bold">DEMO MODE</span>
          <span className="hidden sm:inline">-</span>
          <span>Je bekijkt een live demo. Aanpassingen zijn uitgeschakeld.</span>
        </div>
        <Link 
          href="/registreer"
          className="bg-white text-orange-600 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-orange-100 transition-colors whitespace-nowrap"
        >
          Start je eigen shop →
        </Link>
      </div>
    </div>
  )
}

/**
 * CSS class helper voor disabled buttons/inputs in demo mode
 */
export const demoDisabledClass = 'opacity-50 cursor-not-allowed pointer-events-none'
