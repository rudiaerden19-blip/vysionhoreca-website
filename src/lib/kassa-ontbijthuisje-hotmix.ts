/** Hotmix-knop in de kassa — alleen tenant t ontbijthuisje. */

export const ONTBIJTHUISJE_HOTMIX_URL = 'https://www.hotmixradio.com'

function compactTenantSlug(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function isOntbijthuisjeHotmixTenant(slug: string | null | undefined): boolean {
  return compactTenantSlug(slug) === 'tontbijthuisje'
}
