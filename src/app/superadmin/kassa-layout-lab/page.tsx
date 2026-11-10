'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  KASSA_LAYOUT_LAB_FRAMES,
  buildKassaLayoutPreviewKassaUrl,
  type KassaLayoutLabFrame,
} from '@/lib/kassa-layout-preview'
import {
  KASSA_LAB_DEFAULT_PANEL_WIDTH_CM,
  kassaLabPhysicalBoxCm,
  labIframeScaleForPhysicalBox,
} from '@/lib/kassa-layout-lab-physical'
import { KASSA_LAYOUT_REGRESSION_FRAME_IDS } from '@/lib/kassa-viewport-chrome-tokens'

const CM_OVERRIDES_STORAGE = 'kassa-layout-lab-cm-overrides-v1'

/** Passend in beeld (niet lineaal). */
const DEFAULT_FIT_SCALE = 0.88

type LabViewMode = 'single' | 'regression'
type LabSizeMode = 'physical' | 'fit' | 'logical'

function labFitScale(cssW: number, viewportInnerWidth: number): number {
  if (!Number.isFinite(cssW) || cssW <= 0) return DEFAULT_FIT_SCALE
  const budget = Math.max(320, Math.min(1680, viewportInnerWidth - 56))
  const fit = budget / cssW
  return Math.min(1, Math.max(0.32, Math.round(fit * 100) / 100))
}

function readCmOverrides(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CM_OVERRIDES_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function KassaLayoutPreviewFrame({
  frame,
  tenantSlug,
  origin,
  sizeMode,
  fitScale,
  cmOverrides,
  iframeKey,
}: {
  frame: KassaLayoutLabFrame
  tenantSlug: string
  origin: string
  sizeMode: LabSizeMode
  fitScale: number
  cmOverrides: Record<string, number>
  iframeKey: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [physicalScale, setPhysicalScale] = useState(0.25)
  const physical = useMemo(
    () => kassaLabPhysicalBoxCm(frame, cmOverrides),
    [cmOverrides, frame],
  )

  const src = useMemo(
    () => buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin || 'https://localhost'),
    [frame, origin, tenantSlug],
  )

  const scale =
    sizeMode === 'physical' ? physicalScale : sizeMode === 'logical' ? 1 : fitScale

  useLayoutEffect(() => {
    if (sizeMode !== 'physical' || !boxRef.current) return undefined
    const el = boxRef.current
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setPhysicalScale(labIframeScaleForPhysicalBox(w, frame.cssW))
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [frame.cssW, physical.widthCm, physical.heightCm, sizeMode])

  const scaledW =
    sizeMode === 'physical'
      ? Math.round(physicalScale * frame.cssW)
      : Math.round(frame.cssW * scale)
  const scaledH =
    sizeMode === 'physical'
      ? Math.round(physicalScale * frame.cssH)
      : Math.round(frame.cssH * scale)

  const openExact = () => {
    window.open(
      src,
      '_blank',
      `popup=1,width=${frame.cssW},height=${frame.cssH},noopener,noreferrer`,
    )
  }

  const sizeLabel =
    sizeMode === 'physical'
      ? `lineaal ~${physical.widthCm.toFixed(1)}×${physical.heightCm.toFixed(1)} cm · ${frame.cssW}px logisch`
      : `${frame.cssW}×${frame.cssH}px · zoom ${Math.round(scale * 100)}%`

  return (
    <section className="flex w-full max-w-full flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-zinc-200">{frame.label}</h2>
        <span className="text-xs text-zinc-500">
          {sizeLabel} · vp={frame.vp}
          {frame.ipadClient ? ' · iPad' : ''}
        </span>
        <button
          type="button"
          onClick={openExact}
          className="ml-auto rounded border border-zinc-600 px-2 py-0.5 text-[11px] text-zinc-300"
        >
          Logische px ({frame.cssW}×{frame.cssH})
        </button>
      </div>
      <div className="max-w-full overflow-x-auto overflow-y-hidden pb-1">
        <div
          ref={sizeMode === 'physical' ? boxRef : undefined}
          className="inline-block overflow-hidden rounded-lg border-2 border-amber-500/40 bg-black shadow-xl"
          style={
            sizeMode === 'physical'
              ? {
                  width: `${physical.widthCm}cm`,
                  height: `${physical.heightCm}cm`,
                }
              : { width: scaledW, height: scaledH }
          }
        >
          <div
            className="relative h-full w-full overflow-hidden"
            style={
              sizeMode === 'physical'
                ? undefined
                : { width: scaledW, height: scaledH }
            }
          >
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
        {sizeMode === 'physical' ? (
          <p className="mt-1 text-[11px] text-amber-200/80">
            Meet de oranje rand: breedte moet {physical.widthCm.toFixed(1)} cm zijn (hoogte{' '}
            {physical.heightCm.toFixed(1)} cm).
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default function SuperadminKassaLayoutLabPage() {
  const searchParams = useSearchParams()
  const initialTenant = (searchParams?.get('tenant') || '').trim().toLowerCase()
  const [tenantSlug, setTenantSlug] = useState(initialTenant)
  const [viewMode, setViewMode] = useState<LabViewMode>('regression')
  const [sizeMode, setSizeMode] = useState<LabSizeMode>('physical')
  const [scale, setScale] = useState(DEFAULT_FIT_SCALE)
  const [activeId, setActiveId] = useState<KassaLayoutLabFrame['id']>('15')
  const [iframeKey, setIframeKey] = useState(0)
  const [viewportW, setViewportW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  )
  const [cmOverrides, setCmOverrides] = useState<Record<string, number>>({})

  useEffect(() => {
    setCmOverrides(readCmOverrides())
  }, [])

  const persistCm = useCallback((next: Record<string, number>) => {
    setCmOverrides(next)
    try {
      window.localStorage.setItem(CM_OVERRIDES_STORAGE, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const setFrameCm = useCallback(
    (id: string, cm: number) => {
      if (!(cm > 0)) return
      persistCm({ ...cmOverrides, [id]: cm })
    },
    [cmOverrides, persistCm],
  )

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  const fitScaleForFrame = useCallback(
    (frame: KassaLayoutLabFrame) => labFitScale(frame.cssW, viewportW),
    [viewportW],
  )

  const kassaSrc = useMemo(() => {
    if (!tenantSlug || !activeFrame) return ''
    return buildKassaLayoutPreviewKassaUrl(tenantSlug, activeFrame, origin || 'https://localhost')
  }, [activeFrame, origin, tenantSlug])

  const entryKassaHref = tenantSlug
    ? `/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(tenantSlug)}&path=${encodeURIComponent('/admin/kassa')}`
    : null

  const refreshPreview = useCallback(() => setIframeKey((k) => k + 1), [])

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

  function CmCalibrationStrip() {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs">
        <span className="font-semibold text-amber-100">Kalibratie lineaal:</span>
        <div className="flex items-center gap-2">
          <div
            className="h-3 shrink-0 rounded-sm bg-amber-400"
            style={{ width: '10cm' }}
            title="10 cm"
          />
          <span className="text-amber-100/90">= 10 cm</span>
        </div>
        <span className="text-zinc-400">
          Klopt 10 cm niet op jouw scherm? Pas paneelbreedte hieronder aan tot de preview overeenkomt
          met de kassa-PC in de zaak.
        </span>
      </div>
    )
  }

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
          <div className="flex rounded-lg border border-amber-500/40 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSizeMode('physical')}
              className={`rounded-md px-2 py-1 ${
                sizeMode === 'physical' ? 'bg-amber-500 text-black' : 'text-zinc-400'
              }`}
            >
              Lineaal (cm)
            </button>
            <button
              type="button"
              onClick={() => setSizeMode('fit')}
              className={`rounded-md px-2 py-1 ${
                sizeMode === 'fit' ? 'bg-amber-500 text-black' : 'text-zinc-400'
              }`}
            >
              Passend scherm
            </button>
            <button
              type="button"
              onClick={() => setSizeMode('logical')}
              className={`rounded-md px-2 py-1 ${
                sizeMode === 'logical' ? 'bg-amber-500 text-black' : 'text-zinc-400'
              }`}
            >
              1 CSS-px
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
              Nieuw venster (logische px)
            </button>
          )}
          {viewMode === 'single' && sizeMode === 'fit' ? (
            <label className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
              Zoom {Math.round(scale * 100)}%
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
            <p className="ml-auto max-w-lg text-right text-xs text-zinc-500">
              {sizeMode === 'physical'
                ? '1366×768 = logische resolutie van de kassa; Lineaal (cm) = fysieke grootte zoals op het echte paneel.'
                : 'Lineaal-modus: meet de rand van de preview — niet je browser op 1366px breed.'}
            </p>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-[1800px] text-xs text-zinc-500">
          Dit lab wijzigt <strong className="text-zinc-300">geen</strong> kassa bij klanten — alleen
          vooraf kijken. Wat zij op de toog zien = echte PC → «Open 3 vensters» of kassa in de zaak.
        </p>
        {sizeMode === 'physical' ? (
          <div className="mx-auto mt-2 flex max-w-[1800px] flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span className="font-semibold text-amber-200/90">Paneelbreedte (cm) 21·15·17:</span>
            {KASSA_LAYOUT_REGRESSION_FRAME_IDS.map((id) => {
              const def = KASSA_LAB_DEFAULT_PANEL_WIDTH_CM[id] ?? 34.5
              const val = cmOverrides[id] ?? def
              return (
                <label key={id} className="flex items-center gap-1">
                  {id}″
                  <input
                    type="number"
                    min={20}
                    max={80}
                    step={0.1}
                    value={val}
                    onChange={(e) => setFrameCm(id, Number(e.target.value))}
                    className="w-16 rounded border border-zinc-600 bg-zinc-900 px-1 py-0.5 text-zinc-100"
                  />
                  cm
                </label>
              )
            })}
          </div>
        ) : null}
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
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-10">
            {sizeMode === 'physical' ? <CmCalibrationStrip /> : null}
            {regressionFrames.map((frame) => (
              <KassaLayoutPreviewFrame
                key={frame.id}
                frame={frame}
                tenantSlug={tenantSlug}
                origin={origin}
                sizeMode={sizeMode}
                fitScale={fitScaleForFrame(frame)}
                cmOverrides={cmOverrides}
                iframeKey={iframeKey}
              />
            ))}
          </div>
        ) : (
          <>
            {sizeMode === 'physical' ? <CmCalibrationStrip /> : null}
          <KassaLayoutPreviewFrame
            frame={activeFrame}
            tenantSlug={tenantSlug}
            origin={origin}
            sizeMode={sizeMode === 'fit' ? 'fit' : sizeMode}
            fitScale={sizeMode === 'fit' ? scale : fitScaleForFrame(activeFrame)}
            cmOverrides={cmOverrides}
            iframeKey={iframeKey}
          />
          </>
        )}
      </main>
    </div>
  )
}
