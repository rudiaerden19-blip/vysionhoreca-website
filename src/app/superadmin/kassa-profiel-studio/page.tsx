'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-headers'
import {
  KASSA_VIEWPORT_PROFILE_IDS,
  KASSA_VIEWPORT_PROFILE_REGISTRY,
  kassaLabFrameForProfileId,
  type KassaViewportProfileId,
} from '@/lib/kassa-viewport-profile-id'
import { buildKassaLayoutPreviewKassaUrl } from '@/lib/kassa-layout-preview'
import {
  KASSA_VIEWPORT_SETTINGS_LIMITS,
  type KassaViewportProfileSettings,
  kassaDefaultProfileSettingsFromTokens,
} from '@/lib/kassa-viewport-profile-settings'
import { kassaLabPhysicalBoxCm, labIframeScaleForPhysicalBox } from '@/lib/kassa-layout-lab-physical'

type ProfileRow = {
  profileId: KassaViewportProfileId
  settings: KassaViewportProfileSettings
  updatedAt: string | null
  updatedByEmail: string | null
}

function LabPreview({
  profileId,
  tenantSlug,
  settings,
  iframeKey,
}: {
  profileId: KassaViewportProfileId
  tenantSlug: string
  settings: KassaViewportProfileSettings
  iframeKey: number
}) {
  const frame = kassaLabFrameForProfileId(profileId)
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const physical = frame ? kassaLabPhysicalBoxCm(frame) : { widthCm: 34.5, heightCm: 19.4 }

  const src = useMemo(() => {
    if (!frame || !tenantSlug) return ''
    return buildKassaLayoutPreviewKassaUrl(tenantSlug, frame, origin || 'https://localhost')
  }, [frame, origin, tenantSlug])

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el || !frame) return undefined
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
  }, [frame, physical.heightCm, physical.widthCm])

  if (!frame) return null

  return (
    <div
      ref={boxRef}
      className="relative box-border w-full overflow-hidden border-2 border-amber-500 bg-[#0b0f14]"
      style={{ aspectRatio: `${frame.cssW} / ${frame.cssH}`, maxHeight: 'min(72vh, 820px)' }}
    >
      <iframe
        key={`${profileId}-${iframeKey}-${JSON.stringify(settings)}`}
        title={KASSA_VIEWPORT_PROFILE_REGISTRY[profileId].labelNl}
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
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-zinc-200">
          {value}
          {unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-500"
      />
    </label>
  )
}

export default function KassaProfielStudioPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenantSlug, setTenantSlug] = useState('ohgreen')
  const [activeProfile, setActiveProfile] = useState<KassaViewportProfileId>('wide15')
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [draft, setDraft] = useState<KassaViewportProfileSettings | null>(null)
  const [iframeKey, setIframeKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/superadmin/kassa-viewport-profiles')
      const data = (await res.json()) as { profiles?: ProfileRow[]; error?: string }
      if (!res.ok) throw new Error(data.error || 'Laden mislukt')
      setRows(data.profiles ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden mislukt')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activeRow = rows.find((r) => r.profileId === activeProfile)
  const defaults = useMemo(
    () => kassaDefaultProfileSettingsFromTokens(activeProfile),
    [activeProfile],
  )

  useEffect(() => {
    if (activeRow) setDraft({ ...activeRow.settings })
    else setDraft({ ...defaults })
  }, [activeRow, defaults])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch('/api/superadmin/kassa-viewport-profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: activeProfile, settings: draft }),
      })
      const data = (await res.json()) as { profiles?: ProfileRow[]; error?: string }
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
      setRows(data.profiles ?? [])
      setIframeKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  const resetProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch('/api/superadmin/kassa-viewport-profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: activeProfile, reset: true }),
      })
      const data = (await res.json()) as { profiles?: ProfileRow[]; error?: string }
      if (!res.ok) throw new Error(data.error || 'Reset mislukt')
      setRows(data.profiles ?? [])
      setIframeKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset mislukt')
    } finally {
      setSaving(false)
    }
  }

  const lim = KASSA_VIEWPORT_SETTINGS_LIMITS

  return (
    <div className="min-h-screen bg-[#0a0e13] text-zinc-100">
      <header className="border-b border-white/10 bg-[#0f1419] px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
          <Link href="/superadmin" className="text-sm text-[#58CCFF]">
            ← Superadmin
          </Link>
          <h1 className="text-base font-bold">Kassa profiel studio</h1>
          <span className="text-xs text-zinc-500">Geldt voor alle zaken · per schermprofiel geïsoleerd</span>
          <input
            className="ml-auto w-36 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value.trim().toLowerCase())}
            placeholder="tenant slug"
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {KASSA_VIEWPORT_PROFILE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveProfile(id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeProfile === id
                  ? 'border-teal-500 bg-teal-500/15 font-semibold text-white'
                  : 'border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {KASSA_VIEWPORT_PROFILE_REGISTRY[id].labelNl}
            </button>
          ))}
        </nav>

        <section className="min-w-0">
          {loading || !draft ? (
            <p className="text-zinc-500">Laden…</p>
          ) : (
            <LabPreview
              profileId={activeProfile}
              tenantSlug={tenantSlug}
              settings={draft}
              iframeKey={iframeKey}
            />
          )}
          <p className="mt-2 text-xs text-zinc-500">
            Preview = klant-kassa in zaak (zelfde profiel). Print, OSK en betaalflow worden niet aangepast.
          </p>
        </section>

        <aside className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-bold">{KASSA_VIEWPORT_PROFILE_REGISTRY[activeProfile].labelNl}</h2>
          {activeRow?.updatedAt ? (
            <p className="text-[10px] text-zinc-500">
              Laatste save: {new Date(activeRow.updatedAt).toLocaleString('nl-BE')}
              {activeRow.updatedByEmail ? ` · ${activeRow.updatedByEmail}` : ''}
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500">Code-defaults (nog geen override)</p>
          )}
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          {draft ? (
            <div className="space-y-4">
              <SliderField
                label="Tegels groter/kleiner"
                value={draft.menuTileHeightBoost}
                min={lim.menuTileHeightBoost.min}
                max={lim.menuTileHeightBoost.max}
                step={0.05}
                onChange={(v) => setDraft((d) => (d ? { ...d, menuTileHeightBoost: v } : d))}
              />
              <SliderField
                label="Mand breedte"
                value={draft.sidebarWidthPx}
                min={lim.sidebarWidthPx.min}
                max={lim.sidebarWidthPx.max}
                step={1}
                unit="px"
                onChange={(v) => setDraft((d) => (d ? { ...d, sidebarWidthPx: v } : d))}
              />
              <SliderField
                label="Menu-kolommen"
                value={draft.menuClassicGridCols}
                min={lim.menuClassicGridCols.min}
                max={lim.menuClassicGridCols.max}
                step={1}
                onChange={(v) => setDraft((d) => (d ? { ...d, menuClassicGridCols: v } : d))}
              />
              <SliderField
                label="Tegel-gap"
                value={draft.menuGridGapPx}
                min={lim.menuGridGapPx.min}
                max={lim.menuGridGapPx.max}
                step={1}
                unit="px"
                onChange={(v) => setDraft((d) => (d ? { ...d, menuGridGapPx: v } : d))}
              />
              <SliderField
                label="Zichtbare rijen (doel)"
                value={draft.menuVisibleRows}
                min={lim.menuVisibleRows.min}
                max={lim.menuVisibleRows.max}
                step={1}
                onChange={(v) => setDraft((d) => (d ? { ...d, menuVisibleRows: v } : d))}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={saving || !draft}
              onClick={() => void save()}
              className="rounded-lg bg-teal-600 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {saving ? 'Opslaan…' : 'Opslaan (alle zaken)'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void resetProfile()}
              className="rounded-lg border border-zinc-600 py-2 text-sm text-zinc-300"
            >
              Terug naar code-default
            </button>
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="rounded-lg border border-zinc-700 py-2 text-xs text-zinc-400"
            >
              Preview vernieuwen
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
