/** Horeca-kassa footer: BTW-bon (standaard) of Lade open (per tenant). */

export function kassaShowsDrawerInsteadOfBtwBon(
  settings: { kassa_footer_drawer_button?: boolean | null } | null | undefined,
): boolean {
  return settings?.kassa_footer_drawer_button === true
}
