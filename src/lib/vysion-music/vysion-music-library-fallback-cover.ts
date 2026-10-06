function playlistCoverLetter(name: string): string {
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '♪'
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Vaste kleuren per playlistnaam — zelfde naam = zelfde cover. */
export function vysionMusicLibraryFallbackCoverColors(name: string): { from: string; to: string } {
  const h = hashString(name.trim().toLowerCase() || 'playlist')
  const hue = h % 360
  const hue2 = (hue + 28 + (h % 40)) % 360
  return {
    from: `hsl(${hue} 42% 32%)`,
    to: `hsl(${hue2} 48% 22%)`,
  }
}

export function vysionMusicLibraryFallbackCoverSvg(name: string): string {
  const label = playlistCoverLetter(name)
  const safeName = name.trim() || 'Playlist'
  const { from, to } = vysionMusicLibraryFallbackCoverColors(safeName)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${esc(from)}"/>
      <stop offset="100%" stop-color="${esc(to)}"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" fill="url(#g)"/>
  <text x="64" y="74" text-anchor="middle" font-family="system-ui,sans-serif" font-size="52" font-weight="700" fill="rgba(255,255,255,0.92)">${esc(label)}</text>
</svg>`
}

export function vysionMusicLibraryFallbackCoverPath(name: string): string {
  return `/api/soundtrack/library-cover?name=${encodeURIComponent(name.trim() || 'Playlist')}`
}
