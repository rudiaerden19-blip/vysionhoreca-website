'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  KASSA_LAYOUT_LAB_FRAMES,
  buildKassaLayoutPreviewKassaUrl,
  type KassaLayoutLabFrame,
} from '@/lib/kassa-layout-preview'
import { KASSA_LAYOUT_REGRESSION_FRAME_IDS } from '@/lib/kassa-viewport-chrome-tokens'

/** Passend in beeld; 1 = echte pixelgrootte (scroll). */
const DEFAULT_FIT_SCALE = 0.88
const REGRESSION_FIT_SCALE = 0.36

type LabViewMode = 'single' | 'regression'

function KassaLayoutPreviewFrame({
  frame,
  tenantSlug,
  origin,
  scale,
  iframeKey,
}: {
  frame: KassaLayoutLabFrame
  tenantSlug: string
  origin: string
  scale: number
  iframeKey: number
}) {
  const src = useMemo(
    () => buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin || 'https://localhost'),
    [frame, origin, tenantSlug],
  )
  const scaledW = Math.round(frame.cssW * scale)
  const scaledH = Math.round(frame.cssH * scale)

  const openExact = () => {
    window.open(
      src,
      '_blank',
      `popup=1,width=${frame.cssW},height=${frame.cssH},noopener,noreferrer`,
    )
  }

  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-zinc-200">{frame.label}</h2>
        <span className="text-xs text-zinc-500">
          {frame.cssW}×{frame.cssH} · vp={frame.vp}
          {frame.ipadClient ? ' · iPad' : ''}
        </span>
        <button
          type="button"
          onClick={openExact}
          className="ml-auto rounded border border-zinc-600 px-2 py-0.5 text-[11px] text-zinc-300"
        >
          Volle grootte
        </button>
      </div>
      <div
        className="overflow-hidden rounded-lg border-2 border-zinc-600 bg-black shadow-xl"
        style={{ width: scaledW, height: scaledH }}
      >
        <div className="relative overflow-hidden" style={{ width: scaledW, height: scaledH }}>
          <iframe
            key={`${frame.id}-${iframeKey}`}
            title={`${frame.label} — ${tenantSlug}`}
            src={src}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: frame.cssW,
              height: frame.cssH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              border: 'none',
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
  const [viewMode, setViewMode] = useState<LabViewMode>('regression')
  const [scale, setScale] = useState(DEFAULT_FIT_SCALE)
  const [activeId, setActiveId] = useState<KassaLayoutLabFrame['id']>('15')
  const [iframeKey, setIframeKey] = useState(0)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const activeFrame = useMemo(
    () => KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === activeId) ?? KASSA_LAYOUT_LAB_FRAMES[0],
    [activeId],
  )

  const regressionFrames = useMemo(
    () =>
      KASSA_LAYOUT_REGRESSION_FRAME_IDS.map(
        (id) => KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === id)!,
      ).filter(Boolean),
    [],
  )

  const effectiveScale = viewMode === 'regression' ? REGRESSION_FIT_SCALE : scale

  const kassaSrc = useMemo(() => {
    if (!tenantSlug || !activeFrame) return ''
    return buildKassaLayoutPreviewKassaUrl(tenantSlug, activeFrame, origin || 'https://localhost')
  }, [activeFrame, origin, tenantSlug])

  const entryKassaHref = tenantSlug
    ? `/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(tenantSlug)}&path=${encodeURIComponent('/admin/kassa')}`
    : null

  const refreshPreview = useCallback(() => setIframeKey((k) => k + 1), [])

  const scaledW = Math.round(activeFrame.cssW * effectiveScale)
  const scaledH = Math.round(activeFrame.cssH * effectiveScale)

  const openExactWindow = useCallback(() => {
    if (!kassaSrc) return
    window.open(
      kassaSrc,
      '_blank',
      `popup=1,width=${activeFrame.cssW},height=${activeFrame.cssH},noopener,noreferrer`,
    )
  }, [activeFrame.cssH, activeFrame.cssW, kassaSrc])

  const openAllRegressionWindows = useCallback(() => {
    if (!tenantSlug || !origin) return
    for (const frame of regressionFrames) {
      const url = buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin)
      window.open(
        url,
        `kassa-layout-${frame.id}`,
        `popup=1,width=${frame.cssW},height=${frame.cssH},noopener,noreferrer`,
      )
    }
  }, [origin, regressionFrames, tenantSlug])

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1419] text-zinc-100">
      <header className="shrink-0 border-b border-white/10 bg-[#0f1419] px-4 py-3">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2">
          <Link href="/superadmin" className="text-sm font-semibold text-[#58CCFF]">
            ← Superadmin
          </Link>
          <h1 className="text-lg font-bold">Kassa layout-lab</h1>
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
              Kassa openen (login)
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
          <div className="flex rounded-lg border border-zinc-600 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('regression')}
              className={`rounded-md px-2.5 py-1 ${
                viewMode === 'regression' ? 'bg-[#58CCFF] text-[#063042]' : 'text-zinc-400'
              }`}
            >
              Regressie 21·15·17
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`rounded-md px-2.5 py-1 ${
                viewMode === 'single' ? 'bg-[#58CCFF] text-[#063042]' : 'text-zinc-400'
              }`}
            >
              Eén scherm
            </button>
          </div>
          {viewMode === 'regression' ? (
            <button
              type="button"
              onClick={openAllRegressionWindows}
              disabled={!tenantSlug}
              className="rounded-lg border border-amber-500/50 bg-amber-900/30 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Open 3 vensters (live check)
            </button>
          ) : (
            <button
              type="button"
              onClick={openExactWindow}
              disabled={!kassaSrc}
              className="rounded-lg border border-teal-500/50 bg-teal-900/40 px-3 py-1.5 text-sm"
            >
              Nieuw venster (volle grootte)
            </button>
          )}
          {viewMode === 'single' ? (
            <label className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
              Schaal {Math.round(scale * 100)}%
              <input
                type="range"
                min={0.45}
                max={1}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
            </label>
          ) : (
            <p className="ml-auto max-w-md text-right text-xs text-zinc-500">
              Zelfde tenant als in de zaak — controleren of 21″/15″/17″ na een wijziging nog klopt.
              Eerst «Kassa openen (login)» voor iframe-sessie.
            </p>
          )}
        </div>
        {viewMode === 'single' ? (
          <div className="mx-auto mt-2 flex max-w-[1800px] flex-wrap gap-1.5">
            {KASSA_LAYOUT_LAB_FRAMES.map((frame) => (
              <button
                key={frame.id}
                type="button"
                onClick={() => {
                  setActiveId(frame.id)
                  setIframeKey((k) => k + 1)
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  frame.id === activeId
                    ? 'bg-[#58CCFF] text-[#063042]'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {frame.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4">
        {!tenantSlug ? (
          <p className="text-zinc-400">Vul een tenant slug in (bv. oh-green).</p>
        ) : viewMode === 'regression' ? (
          <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 xl:grid-cols-3">
            {regressionFrames.map((frame) => (
              <KassaLayoutPreviewFrame
                key={frame.id}
                frame={frame}
                tenantSlug={tenantSlug}
                origin={origin}
                scale={effectiveScale}
                iframeKey={iframeKey}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-[1600px]">
            <p className="mb-2 text-sm text-zinc-400">
              {activeFrame.label} — {activeFrame.cssW}×{activeFrame.cssH}px · vp={activeFrame.vp}
              {activeFrame.ipadClient ? ' · iPad-raster' : ''}. Voorbeeld {scaledW}×{scaledH}px op
              dit scherm.
            </p>
            <div
              className="inline-block overflow-hidden rounded-lg border-2 border-zinc-600 bg-black shadow-2xl"
              style={{ width: scaledW, height: scaledH }}
            >
              <div
                className="relative overflow-hidden"
                style={{ width: scaledW, height: scaledH }}
              >
                <iframe
                  key={`${activeId}-${iframeKey}`}
                  title={`${activeFrame.label} — ${tenantSlug}`}
                  src={kassaSrc}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: activeFrame.cssW,
                    height: activeFrame.cssH,
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                    border: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
