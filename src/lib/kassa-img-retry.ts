/**
 * Bij een mislukte product-/categorie-afbeelding: één retry met cache-bust query.
 * Lost o.a. corrupte Service Worker image-cache op één terminal op (andere PC's blijven OK).
 */
export function kassaProductImageRetryOnError(ev: { currentTarget: HTMLImageElement }): void {
  const img = ev.currentTarget
  if (img.getAttribute('data-vysion-img-retry') === '1') return
  img.setAttribute('data-vysion-img-retry', '1')
  try {
    const baseSrc = img.src
    const u = new URL(baseSrc, typeof window !== 'undefined' ? window.location.href : undefined)
    u.searchParams.set('vysion_retry', String(Date.now()))
    img.src = u.toString()
  } catch {
    /* ignore */
  }
}
