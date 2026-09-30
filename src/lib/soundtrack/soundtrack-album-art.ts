/**
 * soundcdn artwork-URLs: GraphQL geeft o.a. /k/1200/400/… terwijl /k/1200/1200/…
 * dezelfde soundtrack:artwork-id is — volledige hoes in het vak.
 */
export function soundtrackAlbumArtUrl(raw: string | null | undefined): string | null {
  const url = raw?.trim()
  if (!url) return null

  return url.replace(
    /\/k\/(\d+)\/(\d+)\/(soundtrack:artwork:[^/?#]+)/i,
    (_match, w: string, h: string, artworkPath: string) => {
      const wi = Number(w)
      const hi = Number(h)
      if (!wi || !hi) return `/k/${w}/${h}/${artworkPath}`
      const side = Math.max(wi, hi)
      return `/k/${side}/${side}/${artworkPath}`
    },
  )
}
