/** Kassa-schermprofiel: 17″ SXGA blijft apart van 15″ breedbeeld. */

export type KassaViewportProfile = 'sxga17' | 'wide15' | 'default'

export function isSxga17CssViewport(wCss: number, hCss: number): boolean {
  const lw = Math.max(wCss, hCss)
  const sh = Math.min(wCss, hCss)
  if (lw < 990 || lw > 1380 || sh < 796 || sh > 1108) return false
  const r = lw / sh
  return r >= 1.158 && r <= 1.36
}

export function isSxga17PhysicalPair(a: number, b: number): boolean {
  if (!(a > 0 && b > 0)) return false
  const lw = Math.max(a, b)
  const sh = Math.min(a, b)
  return lw >= 1248 && lw <= 1312 && sh >= 1000 && sh <= 1060 && lw / sh >= 1.18 && lw / sh <= 1.32
}

/**
 * 15–16″ landschap (1366×768, 1280×800, 1024×768, 1080p met schaal).
 * Geen 17″ 4∶3 en geen volle 1920×1080.
 */
export function isWide15CssViewport(wCss: number, hCss: number): boolean {
  if (!(wCss > 0 && hCss > 0) || wCss <= hCss) return false
  if (isSxga17CssViewport(wCss, hCss)) return false
  if (hCss < 680 || hCss > 900) return false
  if (wCss < 1000 || wCss > 1680) return false
  const r = wCss / hCss
  return r >= 1.28 && r <= 1.95
}

export function resolveKassaViewportProfile(input: {
  cssW: number
  cssH: number
  screenW?: number
  screenH?: number
  availW?: number
  availH?: number
  matchMediaSxga?: boolean
}): KassaViewportProfile {
  const { cssW, cssH } = input
  if (isSxga17CssViewport(cssW, cssH)) return 'sxga17'
  if (
    input.screenW != null &&
    input.screenH != null &&
    isSxga17PhysicalPair(input.screenW, input.screenH)
  ) {
    return 'sxga17'
  }
  if (
    input.availW != null &&
    input.availH != null &&
    isSxga17PhysicalPair(input.availW, input.availH)
  ) {
    return 'sxga17'
  }
  if (input.matchMediaSxga) return 'sxga17'

  if (cssW > cssH && cssW >= 860 && cssH >= 620) {
    const inSizeBand = cssW >= 980 && cssW <= 1400 && cssH >= 796 && cssH <= 1090
    if (inSizeBand) {
      const r = cssW / cssH
      if (r >= 1.2 && r <= 1.36) return 'sxga17'
    }
  }

  if (isWide15CssViewport(cssW, cssH)) return 'wide15'
  return 'default'
}

export function readKassaViewportProfileFromWindow(): KassaViewportProfile {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'default'

  const ua = navigator.userAgent
  if (/\biPhone\b|\biPod\b/.test(ua)) return 'default'
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'default'

  const vv = window.visualViewport
  const wSrc = vv?.width != null && vv.width > 0 ? vv.width : window.innerWidth
  const hSrc = vv?.height != null && vv.height > 0 ? vv.height : window.innerHeight
  const cssW = Math.max(1, Math.floor(wSrc))
  const cssH = Math.max(1, Math.floor(hSrc))

  const scr = window.screen
  const matchMediaSxga =
    typeof window.matchMedia === 'function' &&
    window.matchMedia(
      '(min-width: 1000px) and (max-width: 1420px) and (min-height: 785px) and (max-height: 1100px) and (min-aspect-ratio: 1215/1000) and (max-aspect-ratio: 1395/1000)',
    ).matches

  return resolveKassaViewportProfile({
    cssW,
    cssH,
    screenW: scr?.width,
    screenH: scr?.height,
    availW: scr?.availWidth,
    availH: scr?.availHeight,
    matchMediaSxga,
  })
}

export function kassaMenuGridColumnCountWide15(vpWcss: number): number {
  if (!Number.isFinite(vpWcss) || vpWcss <= 0) return 2
  if (vpWcss >= 1280) return 5
  if (vpWcss >= 1024) return 4
  if (vpWcss >= 768) return 4
  if (vpWcss >= 640) return 3
  return 2
}
