/**
 * Hex voor theme-color / manifest (Android systeembalk, PWA-splash).
 * Ongeldige invoer → veilige fallback.
 */
export function normalizeThemeColorHex(input: string | null | undefined, fallback = '#ffffff'): string {
  const raw = (input ?? '').trim()
  if (!raw) return fallback

  let h = raw.startsWith('#') ? raw : `#${raw}`
  if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h.toLowerCase()
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    const r = h[1]
    const g = h[2]
    const b = h[3]
    return (`#${r}${r}${g}${g}${b}${b}`).toLowerCase()
  }
  return fallback
}
