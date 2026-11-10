import type { KassaViewportProfile } from '@/lib/kassa-viewport-profile'

/** Alleen superadmin layout-lab; geen productie-feature voor zaken. */
export const KASSA_LAYOUT_PREVIEW_QUERY = 'kassa_layout_preview'

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

export function buildKassaLayoutPreviewKassaUrl(
  tenantSlug: string,
  frame: KassaLayoutLabFrame,
  origin: string,
): string {
  const slug = tenantSlug.trim().toLowerCase()
  const q = new URLSearchParams({
    [KASSA_LAYOUT_PREVIEW_QUERY]: '1',
    vp: frame.vp,
    ipad: frame.ipadClient ? '1' : '0',
  })
  return `${origin.replace(/\/$/, '')}/shop/${encodeURIComponent(slug)}/admin/kassa?${q.toString()}`
}
