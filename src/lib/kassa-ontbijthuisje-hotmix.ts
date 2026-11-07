/** Hotmix-knop in de kassa — alleen tenant t ontbijthuisje. Blijft op deze pagina, home van Hotmix. */

/** Canoniek domein + NL (geen www-hop): cookies en sessie blijven in het iframe. */
export const ONTBIJTHUISJE_HOTMIX_URL = 'https://hotmixradio.com/nl'

function compactTenantSlug(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function isOntbijthuisjeHotmixTenant(slug: string | null | undefined): boolean {
  return compactTenantSlug(slug) === 'tontbijthuisje'
}
