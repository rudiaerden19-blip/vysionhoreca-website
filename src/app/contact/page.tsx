'use client'

import { useEffect } from 'react'

/** Oude URL /contact → homepage-contactblok (zoals vroeger). */
export default function ContactRedirectPage() {
  useEffect(() => {
    window.location.replace('/#contact')
  }, [])
  return (
    <main className="min-h-screen bg-[#E3E3E3] flex items-center justify-center">
      <p className="text-gray-600 text-sm">Doorverwijzen…</p>
    </main>
  )
}
