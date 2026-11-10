'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  KASSA_LAYOUT_LAB_FRAMES,
  buildKassaLayoutPreviewKassaUrl,
  type KassaLayoutLabFrame,
} from '@/lib/kassa-layout-preview'
import { kassaLabPhysicalBoxCm } from '@/lib/kassa-layout-lab-physical'

const SCREEN_IDS = ['15', '17', '21'] as const

const LABELS: Record<(typeof SCREEN_IDS)[number], string> = {
  '15': '15 inch',
  '17': '17 inch vierkant',
  '21': '21 inch',
}

function labIframeCoverScale(boxW: number, boxH: number, cssW: number, cssH: number): number {
  if (!(boxW > 0 && boxH > 0 && cssW > 0 && cssH > 0)) return 0.25
  return Math.max(boxW / cssW, boxH / cssH)
}

function Preview({
  frame,
  label,
  tenantSlug,
  origin,
  iframeKey,
}: {
  frame: KassaLayoutLabFrame
  label: string
  tenantSlug: string
  origin: string
  iframeKey: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const physical = useMemo(() => kassaLabPhysicalBoxCm(frame), [frame])
  const [scale, setScale] = useState(0.25)

  const src = useMemo(
    () => buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin || 'https://localhost'),
    [frame, origin, tenantSlug],
  )

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        setScale(labIframeCoverScale(r.width, r.height, frame.cssW, frame.cssH))
      }
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [frame.cssH, frame.cssW, physical.heightCm, physical.widthCm])

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-sm font-bold text-white">{label}</h2>
      <p className="mb-2 text-xs text-zinc-500">
        {physical.widthCm}×{physical.heightCm} cm · {frame.cssW}×{frame.cssH}px
      </p>
      <div
        ref={boxRef}
        className="relative overflow-hidden border-[3px] border-amber-500 bg-[#0b0f14]"
        style={{
          width: `${physical.widthCm}cm`,
          height: `${physical.heightCm}cm`,
        }}
      >
        <iframe
          key={`${frame.id}-${iframeKey}`}
          title={`${label} — ${tenantSlug}`}
          src={src}
          className="absolute left-0 top-0 m-0 block border-0"
          style={{
            width: frame.cssW,
            height: frame.cssH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </section>
  )
}

export default function SuperadminKassaLayoutLabPage() {
  const searchParams = useSearchParams()
  const initialTenant = (searchParams?.get('tenant') || '').trim().toLowerCase()
  const [tenantSlug, setTenantSlug] = useState(initialTenant)
  const [iframeKey, setIframeKey] = useState(0)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const screens = useMemo(
    () =>
      SCREEN_IDS.map((id) => ({
        id,
        frame: KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === id)!,
        label: LABELS[id],
      })),
    [],
  )

  const entryHref = tenantSlug
    ? `/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(tenantSlug)}&path=${encodeURIComponent('/admin/kassa')}`
    : null

  const refresh = useCallback(() => setIframeKey((k) => k + 1), [])

  return (
    <div className="min-h-screen bg-[#0f1419] text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1419] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/superadmin" className="text-sm text-[#58CCFF]">
            ← Superadmin
          </Link>
          <span className="text-sm font-bold">15″ · 17″ vierkant · 21″</span>
          <input
            type="text"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value.trim().toLowerCase())}
            placeholder="tenant slug"
            className="w-32 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm"
          />
          {entryHref ? (
            <a
              href={entryHref}
              className="rounded bg-[#58CCFF] px-2 py-1 text-sm font-bold text-[#063042]"
            >
              Kassa login
            </a>
          ) : null}
          <button
            type="button"
            onClick={refresh}
            disabled={!tenantSlug}
            className="rounded border border-zinc-600 px-2 py-1 text-sm disabled:opacity-40"
          >
            Vernieuwen
          </button>
        </div>
      </header>

      <main className="overflow-x-auto overflow-y-visible px-4 py-6">
        {!tenantSlug ? (
          <p className="text-zinc-400">Tenant slug invullen.</p>
        ) : (
          screens.map(({ frame, label }) => (
            <Preview
              key={frame.id}
              frame={frame}
              label={label}
              tenantSlug={tenantSlug}
              origin={origin}
              iframeKey={iframeKey}
            />
          ))
        )}
      </main>
    </div>
  )
}
