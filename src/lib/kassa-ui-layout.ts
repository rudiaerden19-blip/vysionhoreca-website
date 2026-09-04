/** Per-tenant kassa-look. Eigenaar kiest via Mode-kiezer. */

export const KASSA_UI_LAYOUT_IDS = ['luxe', 'light', 'slate', 'navy'] as const

export type KassaUiLayoutId = (typeof KASSA_UI_LAYOUT_IDS)[number]

export const KASSA_UI_LAYOUT_OPTIONS: { id: KassaUiLayoutId; labelKey: string }[] = [
  { id: 'luxe', labelKey: 'kassaApp.modeLuxe' },
  { id: 'light', labelKey: 'kassaApp.modeLight' },
  { id: 'slate', labelKey: 'kassaApp.modeSlate' },
  { id: 'navy', labelKey: 'kassaApp.modeNavy' },
]

export function isKassaUiLayoutId(value: unknown): value is KassaUiLayoutId {
  return typeof value === 'string' && (KASSA_UI_LAYOUT_IDS as readonly string[]).includes(value)
}

/** Ontbrekende layout: donker → luxe (huidige default), licht → light. */
export function parseKassaUiLayout(
  raw: unknown,
  darkFallback: boolean | null | undefined,
): KassaUiLayoutId {
  if (isKassaUiLayoutId(raw)) return raw
  return darkFallback === false ? 'light' : 'luxe'
}

export function kassaUiLayoutIsDark(layout: KassaUiLayoutId): boolean {
  return layout !== 'light'
}

/** Espresso- of navy-POS-chrome (knoppen, tegels, footer). Grijs gebruikt de oude kassa-look. */
export function kassaUiLayoutUsesPosLuxury(layout: KassaUiLayoutId): boolean {
  return layout === 'luxe' || layout === 'navy'
}
