'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  KASSA_LAYOUT_LAB_FRAMES,
  buildKassaLayoutPreviewKassaUrl,
  type KassaLayoutLabFrame,
} from '@/lib/kassa-layout-preview'
import {
  KASSA_LAB_FIXED_BOX_CM,
  kassaLabPhysicalBoxCm,
  labIframeScaleForPhysicalBox,
  labIframeScaleFromPhysicalCm,
} from '@/lib/kassa-layout-lab-physical'

/** Scherm 1 → 2 → 3, altijd onder elkaar. */
const KASSA_SUPADMIN_SCREEN_IDS = ['15', '17', '21'] as const

const SCREEN_TITLES: Record<(typeof KASSA_SUPADMIN_SCREEN_IDS)[number], string> = {
  '15': 'Scherm 1 — 15 inch',
  '17': 'Scherm 2 — 17 inch vierkant',
  '21': 'Scherm 3 — 21 inch',
}

function KassaPhysicalPreview({
  frame,
  title,
  tenantSlug,
  origin,
  iframeKey,
}: {
  frame: KassaLayoutLabFrame
  title: string
  tenantSlug: string
  origin: string
  iframeKey: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const physical = useMemo(() => kassaLabPhysicalBoxCm(frame), [frame])
  const [iframeScale, setIframeScale] = useState(() =>
    labIframeScaleFromPhysicalCm(physical.widthCm, frame.cssW),
  )

  const src = useMemo(
    () => buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin || 'https://localhost'),
    [frame, origin, tenantSlug],
  )

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setIframeScale(labIframeScaleForPhysicalBox(w, frame.cssW))
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [frame.cssW, physical.heightCm, physical.widthCm])

  const openLogicalWindow = () => {
    window.open(
      src,
      `_blank-kassa-${frame.id}`,
      `popup=1,width=${frame.cssW},height=${frame.cssH},noopener,noreferrer`,
    )
  }

  return (
    <article className="mb-[1.2cm] flex w-max max-w-full flex-col gap-1.5">
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        <p className="text-xs text-zinc-400">
          {physical.widthCm}×{physical.heightCm} cm · {frame.cssW}×{frame.cssH}px · vp={frame.vp}
        </p>
        <button
          type="button"
          onClick={openLogicalWindow}
          className="text-xs text-[#58CCFF] hover:underline"
        >
          Echt venster openen
        </button>
      </div>
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-lg border-[3px] border-amber-500 bg-black shadow-xl"
        style={{
          width: `${physical.widthCm}cm`,
          height: `${physical.heightCm}cm`,
        }}
      >
        <iframe
          key={`${frame.id}-${iframeKey}`}
          title={`${title} — ${tenantSlug}`}
          src={src}
          className="absolute left-0 top-0 m-0 block border-0"
          style={{
            width: frame.cssW,
            height: frame.cssH,
            transform: `scale(${iframeScale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </article>
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
      KASSA_SUPADMIN_SCREEN_IDS.map((id) => {
        const frame = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === id)!
        return { id, frame, title: SCREEN_TITLES[id] }
      }),
    [],
  )

  const entryKassaHref = tenantSlug
    ? `/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(tenantSlug)}&path=${encodeURIComponent('/admin/kassa')}`
    : null

  const refreshPreview = useCallback(() => setIframeKey((k) => k + 1), [])

  const openAllThree = useCallback(() => {
    if (!tenantSlug || !origin) return
    for (const { frame } of screens) {
      const url = buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin)
      window.open(
        url,
        `kassa-layout-${frame.id}`,
        `popup=1,width=${frame.cssW},height=${frame.cssH},noopener,noreferrer`,
      )
    }
  }, [origin, screens, tenantSlug])

  const sizesLine = KASSA_SUPADMIN_SCREEN_IDS.map(
    (id) => `${id}″ ${KASSA_LAB_FIXED_BOX_CM[id].widthCm}×${KASSA_LAB_FIXED_BOX_CM[id].heightCm} cm`,
  ).join(' · ')

  return (
    <div className="min-h-screen bg-[#0f1419] text-zinc-100">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/superadmin" className="text-sm font-semibold text-[#58CCFF]">
            ← Superadmin
          </Link>
          <h1 className="text-lg font-bold">Kassa 15″ · 17″ · 21″</h1>
          <input
            type="text"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value.trim().toLowerCase())}
            placeholder="tenant slug"
            className="w-36 rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm"
          />
          {entryKassaHref ? (
            <a
              href={entryKassaHref}
              className="rounded-lg bg-[#58CCFF] px-3 py-1.5 text-sm font-bold text-[#063042]"
            >
              Kassa login
            </a>
          ) : null}
          <button
            type="button"
            onClick={refreshPreview}
            disabled={!tenantSlug}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Vernieuwen
          </button>
          <button
            type="button"
            onClick={openAllThree}
            disabled={!tenantSlug}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-black disabled:opacity-40"
          >
            Open 3 vensters
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          {sizesLine}. <strong className="font-medium text-zinc-200">Onder elkaar:</strong> 15″, dan
          17″ vierkant, dan 21″ — vaste cm, geen zoom.
        </p>
      </header>

      <main className="px-4 py-4">
        {!tenantSlug ? (
          <p className="text-zinc-400">Tenant slug → Kassa login → Vernieuwen.</p>
        ) : (
          <div className="flex flex-col items-start">
            {screens.map(({ frame, title }) => (
              <KassaPhysicalPreview
                key={frame.id}
                frame={frame}
                title={title}
                tenantSlug={tenantSlug}
                origin={origin}
                iframeKey={iframeKey}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
