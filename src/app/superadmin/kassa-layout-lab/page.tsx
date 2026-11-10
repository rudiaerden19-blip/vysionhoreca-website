'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  KASSA_LAYOUT_LAB_FRAMES,
  buildKassaLayoutPreviewKassaUrl,
} from '@/lib/kassa-layout-preview'

const LAB_SCALE = 0.42

export default function SuperadminKassaLayoutLabPage() {
  const searchParams = useSearchParams()
  const initialTenant = (searchParams?.get('tenant') || '').trim().toLowerCase()
  const [tenantSlug, setTenantSlug] = useState(initialTenant)
  const [scale, setScale] = useState(LAB_SCALE)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const frames = useMemo(() => {
    if (!tenantSlug) return []
    return KASSA_LAYOUT_LAB_FRAMES.map((frame) => ({
      frame,
      src: buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin || 'https://localhost'),
    }))
  }, [origin, tenantSlug])

  const entryHref = tenantSlug
    ? `/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(tenantSlug)}&path=${encodeURIComponent(`/superadmin/kassa-layout-lab?tenant=${encodeURIComponent(tenantSlug)}`)}`
    : null

  return (
    <div className="min-h-screen bg-[#0f1419] text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1419]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3">
          <Link href="/superadmin" className="text-sm font-semibold text-[#58CCFF]">
            ← Superadmin
          </Link>
          <h1 className="text-lg font-bold">Kassa layout-lab</h1>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">Tenant</span>
            <input
              type="text"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value.trim().toLowerCase())}
              placeholder="bv. cafemarquise"
              className="w-48 rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm"
            />
          </label>
          {entryHref ? (
            <a
              href={entryHref}
              className="rounded-lg bg-[#58CCFF] px-3 py-1.5 text-sm font-bold text-[#063042]"
            >
              Zaak-sessie (voor iframes)
            </a>
          ) : null}
          <label className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
            Zoom {Math.round(scale * 100)}%
            <input
              type="range"
              min={0.25}
              max={0.85}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </label>
        </div>
        <p className="mx-auto mt-2 max-w-[1800px] text-xs text-zinc-500">
          Zelfde kassa-code als productie; vaste CSS-maten + geforceerd profiel (21″ / 15″ / 17″ / iPad).
          Eerst «Zaak-sessie» als iframes leeg of login tonen.
        </p>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-6">
        {!tenantSlug ? (
          <p className="text-zinc-400">Vul een tenant slug in.</p>
        ) : (
          <div className="grid gap-8 xl:grid-cols-2">
            {frames.map(({ frame, src }) => (
              <section
                key={frame.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50"
              >
                <FrameHeader frame={frame} scale={scale} />
                <div className="overflow-auto p-3">
                  <div
                    style={{
                      width: frame.cssW * scale,
                      height: frame.cssH * scale,
                    }}
                  >
                    <iframe
                      title={`${frame.label} — ${tenantSlug}`}
                      src={src}
                      width={frame.cssW}
                      height={frame.cssH}
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        border: '2px solid #333',
                        borderRadius: 8,
                        pointerEvents: 'auto',
                      }}
                      className="bg-black"
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function FrameHeader({
  frame,
  scale,
}: {
  frame: (typeof KASSA_LAYOUT_LAB_FRAMES)[number]
  scale: number
}) {
  return (
    <div className="border-b border-white/10 px-3 py-2">
      <div className="font-semibold">{frame.label}</div>
      <div className="text-xs text-zinc-500">
        {frame.cssW}×{frame.cssH}px CSS · vp={frame.vp}
        {frame.ipadClient ? ' · iPad-raster' : ''} · weergave {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
