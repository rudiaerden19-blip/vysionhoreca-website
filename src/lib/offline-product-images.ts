/**
 * Prefetch product- en logo-URL's zodat de service worker ze in vysion-images kan cachen.
 * Werkt alleen als er netwerk is; faalt stil bij offline of CORS-problemen.
 */
export async function prefetchProductImageUrls(urls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return
  const unique = [...new Set(urls.filter(Boolean))]
  if (unique.length === 0) return

  const chunkSize = 6
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (url) => {
        try {
          await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'default' })
        } catch {
          try {
            await fetch(url, { mode: 'no-cors', cache: 'default' })
          } catch {
            /* negeren */
          }
        }
      })
    )
  }
}
