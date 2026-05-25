/**
 * Dual-monitor kassa: klantscherm op tweede scherm.
 * - Bij window.open: coordinates in de feature-string (Edge/Chromium respecteert dit het best).
 * - Cache in sessionStorage na succesvolle Screen-detection (prefetch of na open).
 * - Daarna moveTo/resizeTo als backup op het popup-window.
 */

type ScreenLike = {
  isPrimary?: boolean
  availLeft: number
  availTop: number
  availWidth: number
  availHeight: number
}

const BOUNDS_STORAGE_KEY = 'vysion_klantscherm_bounds_v1'

function parseStoredBounds(raw: string | null): ScreenLike | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const availLeft = Number(o.availLeft)
    const availTop = Number(o.availTop)
    const availWidth = Number(o.availWidth)
    const availHeight = Number(o.availHeight)
    if ([availLeft, availTop, availWidth, availHeight].some((n) => Number.isNaN(n))) return null
    return { availLeft, availTop, availWidth, availHeight }
  } catch {
    return null
  }
}

/** Laatste bekende tweede scherm (session); synchroon bruikbaar in dezelfde klik als window.open. */
export function readCachedSecondaryBounds(): ScreenLike | null {
  try {
    return parseStoredBounds(sessionStorage.getItem(BOUNDS_STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeCachedSecondaryBounds(bounds: ScreenLike): void {
  try {
    sessionStorage.setItem(
      BOUNDS_STORAGE_KEY,
      JSON.stringify({
        availLeft: bounds.availLeft,
        availTop: bounds.availTop,
        availWidth: bounds.availWidth,
        availHeight: bounds.availHeight,
      }),
    )
  } catch {
    /* private mode / quota */
  }
}

function typedScreen(s: Screen): Screen & {
  availLeft: number
  availTop: number
  availWidth: number
  availHeight: number
  isExtended?: boolean
} {
  return s as Screen & {
    availLeft: number
    availTop: number
    availWidth: number
    availHeight: number
    isExtended?: boolean
  }
}

/**
 * Synchrone gok: tweede scherm rechts van het scherm waar de kassa-browser draait.
 * Faalt netjes als het OS “geen extended desktop” meldt.
 */
export function heuristicSecondaryBoundsSync(screen: Screen): ScreenLike | null {
  const s = typedScreen(screen)
  if (s.isExtended === false) return null
  return {
    availLeft: s.availLeft + s.availWidth,
    availTop: s.availTop,
    availWidth: s.availWidth,
    availHeight: s.availHeight,
  }
}

/** Window.open feature string; integer px voor breed browser-compat. */
export function buildCustomerDisplayPopupFeatures(bounds: ScreenLike): string {
  const left = Math.round(bounds.availLeft)
  const top = Math.round(bounds.availTop)
  const width = Math.max(320, Math.round(bounds.availWidth))
  const height = Math.max(240, Math.round(bounds.availHeight))
  return [
    'popup=yes',
    `left=${left}`,
    `top=${top}`,
    `width=${width}`,
    `height=${height}`,
    /* Edge/Chromium: soms extra viewport; geen garantie */
    'fullscreen=yes',
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=yes',
    'resizable=yes',
  ].join(',')
}

const winWithScreens = (w: Window) =>
  w as Window & { getScreenDetails?: () => Promise<{ screens: ScreenLike[] }> }

/** Tweede scherm via Window Management API, of null. */
export async function resolveSecondaryBoundsViaApi(openerOrPopup: Window): Promise<ScreenLike | null> {
  const w = winWithScreens(openerOrPopup)
  try {
    if (typeof w.getScreenDetails !== 'function') return null
    const details = await w.getScreenDetails()
    const screens = details.screens
    if (screens.length < 2) return null
    return screens.find((s) => s.isPrimary === false) ?? screens[1] ?? null
  } catch {
    return null
  }
}

/** Cache bijgewerkt na permissie — graag vanuit kassa bij mount aanroepen. */
export async function prefetchCustomerDisplayBounds(openerWindow: Window): Promise<void> {
  const b = await resolveSecondaryBoundsViaApi(openerWindow)
  if (b) writeCachedSecondaryBounds(b)
}

/** Elke puls start een nieuwe interval; opruimen voorkomt dubbel move/resize/focus tegen hetzelfde popup. */
const activePulseIntervals = new Map<Window, number>()
const activePulseClears = new Map<Window, number>()

function applyBounds(target: Window, s: ScreenLike, withFocus = true): boolean {
  try {
    target.moveTo(Math.round(s.availLeft), Math.round(s.availTop))
    target.resizeTo(Math.max(320, Math.round(s.availWidth)), Math.max(240, Math.round(s.availHeight)))
    if (withFocus) target.focus()
    return true
  } catch {
    return false
  }
}

function cancelCustomerDisplayPulse(target: Window): void {
  const id = activePulseIntervals.get(target)
  if (id !== undefined) {
    window.clearInterval(id)
    activePulseIntervals.delete(target)
  }
  const t = activePulseClears.get(target)
  if (t !== undefined) {
    window.clearTimeout(t)
    activePulseClears.delete(target)
  }
}

/** Direct na window.open aanroepen (zelfde tick); backup voor browsers die features negeren. */
export function applyCustomerDisplayWindowBounds(target: Window, bounds: ScreenLike): boolean {
  return applyBounds(target, bounds, true)
}

/**
 * Houdt het klantscherm venster op werkgebied-breedte (geen muis op klantscherm).
 * Herhaalt move/resize enkele seconden tegen browser-chrome die eerst kleiner opent.
 *
 * Interval bewust ~0,5–1s i.p.v. sub-200ms: te frequente focus()/move op Windows‑multi‑monitor
 * kan HDMI/compositor-flitsen geven (“scherm uit/terug”).
 */
export function pulseApplyCustomerDisplayBounds(
  target: Window,
  bounds: ScreenLike,
  durationMs = 8000,
  opts?: { intervalMs?: number; focusOnlyFirst?: boolean },
): void {
  const intervalMs =
    opts?.intervalMs ??
    /** langzamer voor minder interferentie met kassa-/OS-focus en display-handshake */
    550
  const focusOnlyFirst = opts?.focusOnlyFirst ?? true

  cancelCustomerDisplayPulse(target)

  let firstTick = true
  const tick = () => {
    if (target.closed) {
      cancelCustomerDisplayPulse(target)
      return
    }
    applyBounds(target, bounds, focusOnlyFirst ? firstTick : true)
    firstTick = false
  }
  tick()
  const id = window.setInterval(tick, intervalMs)
  activePulseIntervals.set(target, id)
  const clearTid = window.setTimeout(() => {
    window.clearInterval(id)
    activePulseIntervals.delete(target)
    activePulseClears.delete(target)
  }, durationMs)
  activePulseClears.set(target, clearTid)
}

/** Popup naar gekozen tweede scherm brengen (ná open). */
export async function positionCustomerDisplayWindow(target: Window): Promise<boolean> {
  const api = await resolveSecondaryBoundsViaApi(target)
  if (api && applyBounds(target, api)) return true

  const heuristic = heuristicSecondaryBoundsSync(target.screen)
  if (!heuristic) return false
  return applyBounds(target, heuristic)
}
