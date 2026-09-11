/** Alleen slides met een echte foto — geen lege vlakken in de hero. */
export function hasShopHeroSlideUrl(url: string | null | undefined): boolean {
  return Boolean(url && url.trim())
}

/** 0 of 1 foto: blijven staan. 2 of 3: naar de volgende gevulde slide. */
export function nextShopHeroSlideIndex(current: number, filledCount: number): number {
  if (filledCount <= 1) return 0
  const n = Math.min(3, Math.max(0, filledCount))
  return (current + 1) % n
}
