/** Hotmix-knop in de kassa — alleen tenant t ontbijthuisje. */

export const ONTBIJTHUISJE_HOTMIX_URL = 'https://www.hotmixradio.com'

/** Benoemd venster: een tweede tik focust hetzelfde venster, geen extra popup. */
export const ONTBIJTHUISJE_HOTMIX_WINDOW = 'vysion-hotmix-tontbijthuisje'

/** Gewoon browservenster. Geen afmetingen: anders maakt de browser er een popup van. */
export function openOntbijthuisjeHotmixWindow(
  openImpl: typeof window.open = window.open.bind(window),
): Window | null {
  const opened = openImpl(ONTBIJTHUISJE_HOTMIX_URL, ONTBIJTHUISJE_HOTMIX_WINDOW)
  opened?.focus()
  return opened
}

function compactTenantSlug(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function isOntbijthuisjeHotmixTenant(slug: string | null | undefined): boolean {
  return compactTenantSlug(slug) === 'tontbijthuisje'
}
