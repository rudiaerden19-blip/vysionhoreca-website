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
} from '@/lib/kassa-layout-lab-physical'

/** Alleen deze drie — vaste cm, fysieke preview. */
const KASSA_SUPADMIN_SCREEN_IDS = ['15', '17', '21'] as const

const SCREEN_TITLES: Record<(typeof KASSA_SUPADMIN_SCREEN_IDS)[number], string> = {
  '15': '15 inch breedbeeld',
  '17': '17 inch vierkant (SXGA)',
  '21': '21 inch (Full HD)',
}

const VASTE_PANELEN_TEKST = KASSA_SUPADMIN_SCREEN_IDS.map((id) => {
  const b = KASSA_LAB_FIXED_BOX_CM[id]
  return `${SCREEN_TITLES[id].split(' ')[0]} ${b.widthCm}×${b.heightCm} cm`
}).join(' · ')

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
  const [scale, setScale] = useState(0.3)
  const physical = useMemo(() => kassaLabPhysicalBoxCm(frame), [frame])

  const src = useMemo(
    () => buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin || 'https://localhost'),
    [frame, origin, tenantSlug],
  )

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setScale(labIframeScaleForPhysicalBox(w, frame.cssW))
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [frame.cssW, physical.heightCm, physical.widthCm])

  const openLogicalWindow = () => {
    window.open(
      src,
      `_blank-kassa-${frame.id}`,
      `popup=1,width=${frame.cssW},height=${frame.cssH},noopener,noreferrer`,
    )
  }

  return (
    <section className="flex w-full flex-col gap-2 border-b border-white/10 pb-10 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <span className="text-sm text-zinc-400">
          {physical.widthCm}×{physical.heightCm} cm beeld · {frame.cssW}×{frame.cssH} kassa · vp=
          {frame.vp}
        </span>
        <button
          type="button"
          onClick={openLogicalWindow}
          className="ml-auto text-xs text-[#58CCFF] underline-offset-2 hover:underline"
        >
          Echt venster openen
        </button>
      </div>
      <div
        ref={boxRef}
        className="inline-block overflow-hidden rounded-lg border-[3px] border-amber-500 bg-black shadow-xl"
        style={{
          width: `${physical.widthCm}cm`,
          height: `${physical.heightCm}cm`,
        }}
      >
        <div className="relative h-full w-full overflow-hidden">
          <iframe
            key={`${frame.id}-${iframeKey}`}
            title={`${title} — ${tenantSlug}`}
            src={src}
            className="absolute left-0 top-0 border-0"
            style={{
              width: frame.cssW,
              height: frame.cssH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
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

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1419] text-zinc-100">
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2">
          <Link href="/superadmin" className="text-sm font-semibold text-[#58CCFF]">
            ← Superadmin
          </Link>
          <h1 className="text-lg font-bold">Kassa — 15″ · 17″ vierkant · 21″</h1>
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
              1× Kassa login (iframes)
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
            Open 3 echte vensters
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-[1200px] text-sm text-zinc-400">
          Vaste maten: <span className="text-amber-200">{VASTE_PANELEN_TEKST}</span>. Meet de{' '}
          <span className="text-amber-400">oranje rand</span> met een lineaal. Wijzigt niets bij
          klanten.
        </p>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 overflow-auto p-4">
        {!tenantSlug ? (
          <p className="text-zinc-400">Vul tenant slug in, dan «Kassa login», dan Vernieuwen.</p>
        ) : (
          screens.map(({ frame, title }) => (
            <KassaPhysicalPreview
              key={frame.id}
              frame={frame}
              title={title}
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
