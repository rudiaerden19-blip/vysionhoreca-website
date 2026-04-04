/**
 * Tenant slug uit *.ordervysion.com host (zelfde logica als middleware).
 * Geen match op apex / www.apex of andere domeinen → null.
 */
export function tenantSlugFromOrdervysionHost(host: string): string | null {
  const h = host.split(':')[0].toLowerCase()
  if (!h.endsWith('.ordervysion.com')) return null
  if (h === 'ordervysion.com' || h === 'www.ordervysion.com') return null

  const parts = h.split('.')
  if (parts[0] === 'www' && parts.length === 4) return parts[1] || null
  if (parts.length >= 3) return parts[0] || null
  return null
}
