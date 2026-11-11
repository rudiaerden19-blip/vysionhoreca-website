'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  KASSA_LAYOUT_LAB_FRAMES,
  buildKassaLayoutPreviewPosUrl,
  type KassaLayoutLabFrame,
  type KassaLayoutLabPosPath,
} from '@/lib/kassa-layout-preview'
import {
  kassaLabPhysicalBoxCm,
  labIframeScaleForPhysicalBox,
} from '@/lib/kassa-layout-lab-physical'
import {
  normalizeKassaLayoutLabTenantSlug,
  readKassaLayoutLabTenantSlug,
  writeKassaLayoutLabTenantSlug,
} from '@/lib/kassa-layout-lab-tenant'

const SCREEN_IDS = ['15', '17', '21', 'ipad-pro-13', 'ipad-10'] as const

const LABELS: Record<(typeof SCREEN_IDS)[number], string> = {
  '15': '15 inch',
  '17': '17 inch vierkant',
  '21': '21 inch',
  'ipad-pro-13': 'iPad 12,9 inch',
  'ipad-10': 'iPad 10 inch',
}


function Preview({
  frame,
  label,
  tenantSlug,
  origin,
  iframeKey,
  posPath,
}: {
  frame: KassaLayoutLabFrame
  label: string
  tenantSlug: string
  origin: string
  iframeKey: number
  posPath: KassaLayoutLabPosPath
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const physical = useMemo(() => kassaLabPhysicalBoxCm(frame), [frame])
  const [scale, setScale] = useState(0.25)

  const src = useMemo(() => {
    const url = new URL(
      buildKassaLayoutPreviewPosUrl(tenantSlug, frame, origin || 'https://localhost', posPath),
    )
    url.searchParams.set('lab_ts', String(iframeKey))
    return url.toString()
  }, [frame, iframeKey, origin, posPath, tenantSlug])

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        setScale(labIframeScaleForPhysicalBox(r.width, r.height, frame.cssW, frame.cssH))
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
        className="relative box-border overflow-hidden border-[3px] border-amber-500 bg-[#0b0f14]"
        style={{
          width: `${physical.widthCm}cm`,
          height: `${physical.heightCm}cm`,
        }}
      >
        <iframe
          key={`${frame.id}-${iframeKey}`}
          title={`${label} — ${tenantSlug}`}
          src={src}
          className="kassa-layout-lab-embed absolute left-0 top-0 m-0 block border-0"
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
  const urlTenant = normalizeKassaLayoutLabTenantSlug(searchParams?.get('tenant') || '')
  const [tenantSlug, setTenantSlug] = useState(() => readKassaLayoutLabTenantSlug(urlTenant))
  const [iframeKey, setIframeKey] = useState(0)
  const [posPath, setPosPath] = useState<KassaLayoutLabPosPath>('kassa')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useLayoutEffect(() => {
    if (urlTenant) return
    const remembered = readKassaLayoutLabTenantSlug('')
    if (remembered && remembered !== tenantSlug) setTenantSlug(remembered)
  }, [urlTenant, tenantSlug])

  useEffect(() => {
    if (!tenantSlug) return
    writeKassaLayoutLabTenantSlug(tenantSlug)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('tenant') === tenantSlug) return
    url.searchParams.set('tenant', tenantSlug)
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`)
  }, [tenantSlug])

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
          <span className="text-sm font-bold">15″ · 17″ · 21″ · iPad 12,9″ · iPad 10″</span>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="sr-only">Preview-zaak</span>
            <input
              type="text"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(normalizeKassaLayoutLabTenantSlug(e.target.value))}
              placeholder="preview-zaak"
              title="Alleen menu/mand in iframe — layout-code geldt voor alle tenants op Vercel"
              className="w-36 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-white"
            />
          </label>
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
            className="rounded border border-zinc-600 px-2 py-1 text-sm"
          >
            Vernieuwen
          </button>
          <span className="ml-2 text-xs text-zinc-500">Scherm:</span>
          <button
            type="button"
            onClick={() => setPosPath('kassa')}
            className={`rounded border px-2 py-1 text-sm ${posPath === 'kassa' ? 'border-amber-500 bg-amber-500/20' : 'border-zinc-600'}`}
          >
            Kassa
          </button>
          <button
            type="button"
            onClick={() => setPosPath('keuken')}
            className={`rounded border px-2 py-1 text-sm ${posPath === 'keuken' ? 'border-amber-500 bg-amber-500/20' : 'border-zinc-600'}`}
          >
            Keuken
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Eén deploy op main = dezelfde layout voor alle tenants. Na studio of deploy: alleen{' '}
          <strong className="text-zinc-300">Vernieuwen</strong> — geen extra stappen.
        </p>
      </header>

      <main className="overflow-x-auto overflow-y-visible px-4 py-6">
        {tenantSlug ? (
          screens.map(({ frame, label }) => (
            <Preview
              key={frame.id}
              frame={frame}
              label={label}
              tenantSlug={tenantSlug}
              origin={origin}
              iframeKey={iframeKey}
              posPath={posPath}
            />
          ))
        ) : null}
      </main>
    </div>
  )
}
