/** Admin-hoofdscroll (zwarte topbalk blijft erbuiten). */
export const ADMIN_SCROLL_SELECTOR = '[data-vysion-admin-scroll]'

const SKIP_INPUT_TYPES = new Set([
  'hidden',
  'checkbox',
  'radio',
  'file',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'image',
])

export function keyboardCoverPxFromViewport(input: {
  innerHeight: number
  visualViewport: { offsetTop: number; height: number } | null
}): number {
  if (!input.visualViewport) return 0
  const visibleBottom = input.visualViewport.offsetTop + input.visualViewport.height
  return Math.max(0, input.innerHeight - visibleBottom)
}

/** Touch-kassa (Elo/iPad): pointer coarse of geen hover. Geen MacBook-trackpad. */
export function isTouchLikePointer(input: {
  pointerCoarse?: boolean
  hoverNone?: boolean
}): boolean {
  return Boolean(input.pointerCoarse || input.hoverNone)
}

/**
 * Ruimte onder het veld: echte OSK-hoogte, of op touch een vaste reserve
 * omdat Windows TabTip visualViewport vaak niet krimpt.
 */
export function keyboardBottomReservePx(input: {
  keyboardCoverPx: number
  innerHeight: number
  touchLike: boolean
}): number {
  if (input.keyboardCoverPx > 24) return input.keyboardCoverPx
  if (input.touchLike) return Math.max(Math.round(input.innerHeight * 0.38), 260)
  return 0
}

/** Positief = scroll omlaag (veld zit te hoog); negatief = omhoog. */
export function scrollDeltaToRevealInput(input: {
  inputTop: number
  inputBottom: number
  safeTop: number
  safeBottom: number
}): number {
  if (input.safeBottom <= input.safeTop) return 0
  if (input.inputTop < input.safeTop) return input.inputTop - input.safeTop
  if (input.inputBottom > input.safeBottom) return input.inputBottom - input.safeBottom
  return 0
}

export function isEditableCatalogTextField(
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (
    !(el instanceof HTMLInputElement) &&
    !(el instanceof HTMLTextAreaElement) &&
    !(el instanceof HTMLSelectElement)
  ) {
    return false
  }
  if (el.disabled) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  if (el.getAttribute('data-osk-ignore') === 'true') return false
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase()
    if (SKIP_INPUT_TYPES.has(type)) return false
    if (el.readOnly) return false
    if (el.tabIndex < 0 && el.classList.contains('pointer-events-none')) return false
  }
  return true
}

export function findScrollParentForKeyboard(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node)
    const oy = style.overflowY
    const canY =
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    if (canY) return node
    node = node.parentElement
  }
  const admin = document.querySelector(ADMIN_SCROLL_SELECTOR)
  return admin instanceof HTMLElement ? admin : null
}

function readTouchLikeFromWindow(): boolean {
  try {
    return isTouchLikePointer({
      pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
      hoverNone: window.matchMedia('(hover: none)').matches,
    })
  } catch {
    return false
  }
}

/** Schuif het gefocuste vak boven het schermtoetsenbord. */
export function scrollInputAboveKeyboard(input: HTMLElement): void {
  const scroller = findScrollParentForKeyboard(input)
  const vv = window.visualViewport
  const visibleTop = vv?.offsetTop ?? 0
  const visibleHeight = vv?.height ?? window.innerHeight
  const cover = keyboardCoverPxFromViewport({
    innerHeight: window.innerHeight,
    visualViewport: vv ? { offsetTop: vv.offsetTop, height: vv.height } : null,
  })
  const reserve = keyboardBottomReservePx({
    keyboardCoverPx: cover,
    innerHeight: window.innerHeight,
    touchLike: readTouchLikeFromWindow(),
  })
  const box = input.getBoundingClientRect()
  const safeTop = visibleTop + 64
  const safeBottom = visibleTop + visibleHeight - reserve - 12
  const delta = scrollDeltaToRevealInput({
    inputTop: box.top,
    inputBottom: box.bottom,
    safeTop,
    safeBottom,
  })
  if (delta === 0) return
  if (scroller instanceof HTMLElement) {
    scroller.scrollTop += delta
    return
  }
  input.scrollIntoView({ block: 'center', inline: 'nearest' })
}

export function scheduleScrollInputAboveKeyboard(input: HTMLElement): () => void {
  const apply = () => {
    if (!input.isConnected) return
    scrollInputAboveKeyboard(input)
  }
  apply()
  const raf = window.requestAnimationFrame(apply)
  const t1 = window.setTimeout(apply, 160)
  const t2 = window.setTimeout(apply, 380)
  return () => {
    window.cancelAnimationFrame(raf)
    window.clearTimeout(t1)
    window.clearTimeout(t2)
  }
}
