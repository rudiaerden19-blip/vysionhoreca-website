/**
 * Dual-monitor kassa: plaats het klantscherm-pop-up op het tweede scherm.
 * Gebruikt Window Management API (Chromium/Edge) als beschikbaar + permissie,
 * anders een heuristiek als het OS een uitgebreid bureaublad meldt (Screen.isExtended).
 */

type ScreenLike = {
  isPrimary?: boolean
  availLeft: number
  availTop: number
  availWidth: number
  availHeight: number
}

function applyBounds(target: Window, s: ScreenLike): boolean {
  try {
    target.moveTo(s.availLeft, s.availTop)
    target.resizeTo(Math.max(320, s.availWidth), Math.max(240, s.availHeight))
    target.focus()
    return true
  } catch {
    return false
  }
}

export async function positionCustomerDisplayWindow(target: Window): Promise<boolean> {
  const anyTarget = target as Window & {
    getScreenDetails?: () => Promise<{ screens: ScreenLike[] }>
  }

  try {
    if (typeof anyTarget.getScreenDetails === 'function') {
      const details = await anyTarget.getScreenDetails()
      const screens = details.screens
      if (screens.length >= 2) {
        const secondary = screens.find((s) => s.isPrimary === false) ?? screens[1]
        if (secondary && applyBounds(target, secondary)) return true
      }
      return false
    }
  } catch {
    /* permission denied / niet ondersteund */
  }

  const domScreen = target.screen as Screen & {
    availLeft: number
    availTop: number
    availWidth: number
    availHeight: number
    isExtended?: boolean
  }

  if (domScreen.isExtended === false) return false

  const guess: ScreenLike = {
    availLeft: domScreen.availLeft + domScreen.availWidth,
    availTop: domScreen.availTop,
    availWidth: domScreen.availWidth,
    availHeight: domScreen.availHeight,
  }
  return applyBounds(target, guess)
}
