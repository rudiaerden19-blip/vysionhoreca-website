'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  KASSA_LAYOUT_LAB_FRAMES,
  buildKassaLayoutPreviewKassaUrl,
  type KassaLayoutLabFrame,
} from '@/lib/kassa-layout-preview'

/** Passend in beeld; 1 = echte pixelgrootte (scroll). */
const DEFAULT_FIT_SCALE = 0.88

export default function SuperadminKassaLayoutLabPage() {
  const searchParams = useSearchParams()
  const initialTenant = (searchParams?.get('tenant') || '').trim().toLowerCase()
  const [tenantSlug, setTenantSlug] = useState(initialTenant)
  const [scale, setScale] = useState(DEFAULT_FIT_SCALE)
  const [activeId, setActiveId] = useState<KassaLayoutLabFrame['id']>('15')
  const [iframeKey, setIframeKey] = useState(0)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const activeFrame = useMemo(
    () => KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === activeId) ?? KASSA_LAYOUT_LAB_FRAMES[0],
    [activeId],
  )

  const kassaSrc = useMemo(() => {
    if (!tenantSlug || !activeFrame) return ''
    return buildKassaLayoutPreviewKassaUrl(tenantSlug, activeFrame, origin || 'https://localhost')
  }, [activeFrame, origin, tenantSlug])

  const entryKassaHref = tenantSlug
    ? `/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(tenantSlug)}&path=${encodeURIComponent('/admin/kassa')}`
    : null

  const refreshPreview = useCallback(() => setIframeKey((k) => k + 1), [])

  const scaledW = Math.round(activeFrame.cssW * scale)
  const scaledH = Math.round(activeFrame.cssH * scale)

  const openExactWindow = useCallback(() => {
    if (!kassaSrc) return
    window.open(
      kassaSrc,
      '_blank',
      `popup=1,width=${activeFrame.cssW},height=${activeFrame.cssH},noopener,noreferrer`,
    )
  }, [activeFrame.cssH, activeFrame.cssW, kassaSrc])

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1419] text-zinc-100">
      <header className="shrink-0 border-b border-white/10 bg-[#0f1419] px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={openExactWindow}
            disabled={!kassaSrc}
            className="rounded-lg border border-teal-500/50 bg-teal-900/40 px-3 py-1.5 text-sm"
          >
            Nieuw venster (volle grootte)
          </button>
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
        </div>
        <div className="mx-auto mt-2 flex max-w-[1600px] flex-wrap gap-1.5">
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
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4">
        {!tenantSlug ? (
          <p className="text-zinc-400">Vul een tenant slug in.</p>
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
                className="relative"
                style={{
                  width: scaledW,
                  height: scaledH,
                  overflow: 'hidden',
                }}
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
                    transform: `scale(${scale})`,
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
