/** Sync met WebAzertyKeyboard + globals.css */
export const VYSION_WEB_KB_OPEN_ATTR = 'data-vysion-web-kb-open'
export const VYSION_WEB_KB_HEIGHT_VAR = '--vysion-web-kb-height'

export function setWebTouchKeyboardInset(heightPx: number): void {
  if (typeof document === 'undefined') return
  const h = Math.max(0, Math.ceil(heightPx))
  document.documentElement.setAttribute(VYSION_WEB_KB_OPEN_ATTR, '1')
  document.documentElement.style.setProperty(VYSION_WEB_KB_HEIGHT_VAR, `${h}px`)
}

export function clearWebTouchKeyboardInset(): void {
  if (typeof document === 'undefined') return
  document.documentElement.removeAttribute(VYSION_WEB_KB_OPEN_ATTR)
  document.documentElement.style.removeProperty(VYSION_WEB_KB_HEIGHT_VAR)
}

function scrollableAncestors(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = []
  let p: HTMLElement | null = el.parentElement
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if (/(auto|scroll|overlay)/.test(oy) && p.scrollHeight > p.clientHeight + 1) {
      out.push(p)
    }
    p = p.parentElement
  }
  return out
}

/** Houd focusveld zichtbaar boven het vaste schermtoetsenbord (alle admin/shop-routes). */
export function scrollInputAboveWebKeyboard(
  field: HTMLElement,
  keyboardHeightPx: number,
  extraGapPx = 24,
): void {
  if (typeof window === 'undefined') return

  const vv = window.visualViewport
  const viewportH = vv?.height ?? window.innerHeight
  const viewportTop = vv?.offsetTop ?? 0
  const visibleBottom = viewportTop + viewportH - keyboardHeightPx - extraGapPx
  const topMargin = viewportTop + extraGapPx
  const rect = field.getBoundingClientRect()

  let scrollDelta = 0
  if (rect.bottom > visibleBottom) {
    scrollDelta = rect.bottom - visibleBottom
  } else if (rect.top < topMargin) {
    scrollDelta = rect.top - topMargin
  }

  if (Math.abs(scrollDelta) < 2) return

  const ancestors = scrollableAncestors(field)
  if (ancestors.length > 0) {
    ancestors[0].scrollTop += scrollDelta
  } else {
    window.scrollBy({ top: scrollDelta, left: 0, behavior: 'auto' })
  }

  requestAnimationFrame(() => {
    const r2 = field.getBoundingClientRect()
    const vb2 =
      (window.visualViewport?.offsetTop ?? 0) +
      (window.visualViewport?.height ?? window.innerHeight) -
      keyboardHeightPx -
      extraGapPx
    if (r2.bottom > vb2) {
      window.scrollBy({ top: r2.bottom - vb2, left: 0, behavior: 'auto' })
    }
  })
}
