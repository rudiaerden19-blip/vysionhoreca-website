/**
 * Of `next/image` de URL mag optimaliseren — gelijk aan `images.remotePatterns` in next.config.js.
 * Onbekende hosts: terug naar <img> zodat tenants geen productiefout krijgen.
 */
export function canUseNextImageOptimizer(src: string): boolean {
  const s = (src || '').trim()
  if (!s || s.startsWith('data:') || s.startsWith('blob:')) return false
  try {
    const u = new URL(s, typeof window !== 'undefined' ? window.location.origin : 'https://example.com')
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const h = u.hostname.toLowerCase()
    if (h.endsWith('.supabase.co') || h.endsWith('.supabase.in')) return true
    if (h === 'images.unsplash.com' || h === 'i.imgur.com' || h === 'api.qrserver.com') return true
    return false
  } catch {
    return false
  }
}
