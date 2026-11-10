import type { KassaViewportProfile } from '@/lib/kassa-viewport-profile'
import { kassaDefaultProfileSettingsFromTokens } from '@/lib/kassa-viewport-profile-settings'
import {
  isKassaViewportProfileId,
  type KassaViewportProfileId,
} from '@/lib/kassa-viewport-profile-id'

/** Alleen superadmin layout-lab; geen productie-feature voor zaken. */
export const KASSA_LAYOUT_PREVIEW_QUERY = 'kassa_layout_preview'
export const KASSA_LAYOUT_PREVIEW_LAB_W = 'lab_w'
export const KASSA_LAYOUT_PREVIEW_LAB_H = 'lab_h'

export type KassaLayoutLabFrame = {
  id: string
  label: string
  cssW: number
  cssH: number
  /** Geforceerd kassa-chrome (niet alleen iframe-maten). */
  vp: KassaViewportProfile
  ipadClient: boolean
}

/** Vaste referentie-maten — zelfde logica als `kassa-viewport-profile` tests. */
export const KASSA_LAYOUT_LAB_FRAMES: KassaLayoutLabFrame[] = [
  { id: '21', label: '21″ Full HD', cssW: 1920, cssH: 1080, vp: 'default', ipadClient: false },
  { id: '15', label: '15″ breedbeeld', cssW: 1366, cssH: 768, vp: 'wide15', ipadClient: false },
  { id: '17', label: '17″ vierkant SXGA', cssW: 1280, cssH: 1024, vp: 'sxga17', ipadClient: false },
  { id: 'ipad-mini', label: 'iPad mini (landschap)', cssW: 1024, cssH: 768, vp: 'default', ipadClient: true },
  { id: 'ipad-10', label: 'iPad 10.2″ (landschap)', cssW: 1080, cssH: 810, vp: 'default', ipadClient: true },
  { id: 'ipad-11', label: 'iPad 11″ (landschap)', cssW: 1194, cssH: 834, vp: 'default', ipadClient: true },
  { id: 'ipad-air', label: 'iPad Air 10.9″ (landschap)', cssW: 1180, cssH: 820, vp: 'default', ipadClient: true },
  { id: 'ipad-pro-11', label: 'iPad Pro 11″ (landschap)', cssW: 1194, cssH: 834, vp: 'default', ipadClient: true },
  { id: 'ipad-pro-13', label: 'iPad Pro 12.9–13″ (landschap)', cssW: 1366, cssH: 1024, vp: 'default', ipadClient: true },
]

export type KassaLayoutPreviewChrome = {
  sxgaDense: boolean
  wide15: boolean
  ipadClient: boolean
}

function parseViewportOverride(raw: string | null): KassaViewportProfile | null {
  const v = (raw || '').trim().toLowerCase()
  if (v === 'sxga17' || v === 'sxga') return 'sxga17'
  if (v === 'wide15' || v === '15') return 'wide15'
  if (v === 'default' || v === '21') return 'default'
  return null
}

export function isKassaLayoutPreviewSearchParams(sp: URLSearchParams): boolean {
  const v = sp.get(KASSA_LAYOUT_PREVIEW_QUERY)
  return v === '1' || v === 'true'
}

/** Chrome-vlaggen uit preview-URL (superadmin-lab). */
export function resolveKassaLayoutPreviewChrome(
  sp: URLSearchParams,
): KassaLayoutPreviewChrome | null {
  if (!isKassaLayoutPreviewSearchParams(sp)) return null
  const vp = parseViewportOverride(sp.get('vp'))
  if (!vp) return null
  const ipadRaw = sp.get('ipad')
  const ipadClient = ipadRaw === '1' || ipadRaw === 'true'
  return {
    sxgaDense: vp === 'sxga17',
    wide15: vp === 'wide15',
    ipadClient,
  }
}

/** Vaste lab-logische pixels — iframe mag niet `device-width` van ultrawide desktop zijn. */
export function resolveKassaLayoutPreviewViewportPixels(
  sp: URLSearchParams,
): { w: number; h: number } | null {
  if (!isKassaLayoutPreviewSearchParams(sp)) return null
  const w = Number.parseInt(sp.get(KASSA_LAYOUT_PREVIEW_LAB_W) ?? '', 10)
  const h = Number.parseInt(sp.get(KASSA_LAYOUT_PREVIEW_LAB_H) ?? '', 10)
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { w, h }
  }
  const vp = parseViewportOverride(sp.get('vp'))
  if (!vp) return null
  const frame = KASSA_LAYOUT_LAB_FRAMES.find(
    (f) => f.vp === vp && (f.id === '15' || f.id === '17' || f.id === '21'),
  )
  return frame ? { w: frame.cssW, h: frame.cssH } : null
}

/** Zet viewport-meta voor layout-lab; cleanup bij unmount. */
export function applyKassaLayoutPreviewViewportFromSearchParams(
  sp: URLSearchParams,
): (() => void) | undefined {
  const dims = resolveKassaLayoutPreviewViewportPixels(sp)
  if (!dims) return undefined
  if (typeof document === 'undefined') return undefined

  let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
  const created = !meta
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'viewport')
    document.head.appendChild(meta)
  }
  const previous = meta.getAttribute('content') ?? ''
  meta.setAttribute(
    'content',
    `width=${dims.w}, height=${dims.h}, initial-scale=1, maximum-scale=1, user-scalable=no`,
  )

  return () => {
    if (created) {
      meta?.remove()
      return
    }
    if (previous) meta?.setAttribute('content', previous)
  }
}

export function buildKassaLayoutPreviewKassaUrl(
  tenantSlug: string,
  frame: KassaLayoutLabFrame,
  origin: string,
): string {
  const slug = tenantSlug.trim().toLowerCase()
  const kvp =
    frame.id === '15'
      ? 'wide15'
      : frame.id === '17'
        ? 'sxga'
        : frame.id === '21'
          ? 'default'
          : frame.id === 'ipad-pro-13'
            ? 'ipad_129'
            : frame.id === 'ipad-10'
              ? 'ipad_10'
              : 'default'
  const q = new URLSearchParams({
    [KASSA_LAYOUT_PREVIEW_QUERY]: '1',
    vp: frame.vp,
    kvp,
    ipad: frame.ipadClient ? '1' : '0',
    [KASSA_LAYOUT_PREVIEW_LAB_W]: String(frame.cssW),
    [KASSA_LAYOUT_PREVIEW_LAB_H]: String(frame.cssH),
  })
  const profileId: KassaViewportProfileId = isKassaViewportProfileId(kvp) ? kvp : 'default'
  const defs = kassaDefaultProfileSettingsFromTokens(profileId)
  q.set('k_sidebar', String(defs.sidebarWidthPx))
  q.set('k_boost', String(defs.menuTileHeightBoost))
  q.set('k_cols', String(defs.menuClassicGridCols))
  q.set('k_gap', String(defs.menuGridGapPx))
  q.set('k_rows', String(defs.menuVisibleRows))
  return `${origin.replace(/\/$/, '')}/shop/${encodeURIComponent(slug)}/admin/kassa?${q.toString()}`
}
