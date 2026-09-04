/** Per-tenant kassa-look. Eigenaar kiest via Mode-kiezer. */

export const KASSA_UI_LAYOUT_IDS = ['light', 'dark', 'luxe', 'speels'] as const

export type KassaUiLayoutId = (typeof KASSA_UI_LAYOUT_IDS)[number]

export const KASSA_UI_LAYOUT_OPTIONS: { id: KassaUiLayoutId; labelKey: string }[] = [
  { id: 'light', labelKey: 'kassaApp.modeLight' },
  { id: 'dark', labelKey: 'kassaApp.modeDark' },
  { id: 'luxe', labelKey: 'kassaApp.modeLuxe' },
  { id: 'speels', labelKey: 'kassaApp.modeSpeels' },
]

const LEGACY_LAYOUT_MAP: Record<string, KassaUiLayoutId> = {
  slate: 'dark',
  navy: 'speels',
}

export function isKassaUiLayoutId(value: unknown): value is KassaUiLayoutId {
  return typeof value === 'string' && (KASSA_UI_LAYOUT_IDS as readonly string[]).includes(value)
}

/** Ontbrekende layout: donker → luxe (huidige default), licht → light. Oude ids worden gemapt. */
export function parseKassaUiLayout(
  raw: unknown,
  darkFallback: boolean | null | undefined,
): KassaUiLayoutId {
  if (isKassaUiLayoutId(raw)) return raw
  if (typeof raw === 'string' && raw in LEGACY_LAYOUT_MAP) return LEGACY_LAYOUT_MAP[raw]
  return darkFallback === false ? 'light' : 'luxe'
}

export function kassaUiLayoutIsDark(layout: KassaUiLayoutId): boolean {
  return layout !== 'light'
}

/** Luxe- en Speels-POS-chrome. Dark is de oude gunmetal-kassa. */
export function kassaUiLayoutUsesPosLuxury(layout: KassaUiLayoutId): boolean {
  return layout === 'luxe' || layout === 'speels'
}
