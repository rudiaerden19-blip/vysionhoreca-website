import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

/** Promo-video’s eerst — anders springt play()-fout direct door naar menufoto’s. */
export function sortKlantschermSlidesForPlayback(
  slides: KlantschermSlideshowSlide[],
): KlantschermSlideshowSlide[] {
  return slides
    .map((slide, index) => ({ slide, index }))
    .sort((a, b) => {
      if (a.slide.type === 'video' && b.slide.type !== 'video') return -1
      if (b.slide.type === 'video' && a.slide.type !== 'video') return 1
      return a.index - b.index
    })
    .map(({ slide }) => slide)
}

export function klantschermSlideshowRefreshChannel(tenantSlug: string): string {
  return `vysion-klantscherm-slideshow-${tenantSlug.trim()}`
}

export function notifyKlantschermSlideshowRefresh(tenantSlug: string): void {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const bc = new BroadcastChannel(klantschermSlideshowRefreshChannel(tenantSlug))
    bc.postMessage({ v: 1, type: 'reload-slideshow' })
    bc.close()
  } catch {
    /* ignore */
  }
}
