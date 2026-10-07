'use client'

import type { ReactNode } from 'react'

/** Warme, professionele achtergrond (geen plat zwart) voor bestelling / QR op klantscherm. */
export function KlantschermDisplayShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="fixed inset-0 flex h-[100dvh] w-screen flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#162033] via-[#243552] to-[#1a2838]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_12%,rgba(251,146,60,0.22)_0%,transparent_42%),radial-gradient(ellipse_at_88%_18%,rgba(96,165,250,0.16)_0%,transparent_40%),radial-gradient(ellipse_at_50%_100%,rgba(167,139,250,0.12)_0%,transparent_48%)] opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04)_0%,transparent_55%)]"
        aria-hidden
      />
      <div className={`relative z-10 flex min-h-0 min-w-0 flex-1 flex-col ${className}`.trim()}>
        {children}
      </div>
    </div>
  )
}
