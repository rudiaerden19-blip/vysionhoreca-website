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
  if (input.touchLike) return Math.max(Math.round(input.innerHeight * 0.42), 320)
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

/** Zet dit op de scrollbare formulier-body (niet op een wrapper zonder overflow). */
export const OSK_SCROLL_SELECTOR = '[data-osk-scroll]'
const OSK_PAD_ATTR = 'data-osk-pad-prev'

export function findScrollParentForKeyboard(el: HTMLElement): HTMLElement | null {
  const marked = el.closest(OSK_SCROLL_SELECTOR)
  if (marked instanceof HTMLElement) return marked

  let node: HTMLElement | null = el.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const oy = window.getComputedStyle(node).overflowY
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return node
    node = node.parentElement
  }
  const admin = document.querySelector(ADMIN_SCROLL_SELECTOR)
  return admin instanceof HTMLElement ? admin : null
}

export function ensureOskScrollPadding(scroller: HTMLElement, padPx: number): void {
  if (!scroller.hasAttribute(OSK_PAD_ATTR)) {
    scroller.setAttribute(OSK_PAD_ATTR, scroller.style.paddingBottom || '')
  }
  scroller.style.paddingBottom = `${Math.max(0, Math.round(padPx))}px`
}

export function releaseOskScrollPadding(scroller: HTMLElement): void {
  if (!scroller.hasAttribute(OSK_PAD_ATTR)) return
  scroller.style.paddingBottom = scroller.getAttribute(OSK_PAD_ATTR) || ''
  scroller.removeAttribute(OSK_PAD_ATTR)
}

export function releaseAllOskScrollPadding(): void {
  document.querySelectorAll(`[${OSK_PAD_ATTR}]`).forEach((node) => {
    if (node instanceof HTMLElement) releaseOskScrollPadding(node)
  })
}

/** Volgende vak in dezelfde popup (Enter / OSK-volgende). */
export function focusNextCatalogField(current: HTMLElement): boolean {
  const root = current.closest(OSK_SCROLL_SELECTOR)
  if (!(root instanceof HTMLElement) || root.getAttribute('data-osk-next') !== 'true') {
    return false
  }
  const fields = Array.from(root.querySelectorAll('input, textarea')).filter((el) =>
    isEditableCatalogTextField(el),
  )
  const idx = fields.indexOf(current as HTMLInputElement | HTMLTextAreaElement)
  if (idx < 0) return false
  const next = fields[idx + 1]
  if (next) {
    next.focus()
    return true
  }
  current.blur()
  return true
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

function readKeyboardBottomReservePx(): number {
  const vv = window.visualViewport
  const cover = keyboardCoverPxFromViewport({
    innerHeight: window.innerHeight,
    visualViewport: vv ? { offsetTop: vv.offsetTop, height: vv.height } : null,
  })
  return keyboardBottomReservePx({
    keyboardCoverPx: cover,
    innerHeight: window.innerHeight,
    touchLike: readTouchLikeFromWindow(),
  })
}

/** Schuif het gefocuste vak boven het schermtoetsenbord. */
export function scrollInputAboveKeyboard(input: HTMLElement): void {
  const scroller = findScrollParentForKeyboard(input)
  const reserve = readKeyboardBottomReservePx()
  if (scroller) {
    if (reserve >= 24) ensureOskScrollPadding(scroller, reserve + 28)
    else releaseOskScrollPadding(scroller)
  }

  const vv = window.visualViewport
  const visibleTop = vv?.offsetTop ?? 0
  const visibleHeight = vv?.height ?? window.innerHeight
  const visibleBottom = visibleTop + visibleHeight
  const box = input.getBoundingClientRect()
  const pane = scroller?.getBoundingClientRect()
  const safeTop = Math.max(visibleTop + 12, pane ? pane.top + 8 : visibleTop + 64)
  const coveredBottom = visibleBottom - reserve - 12
  const safeBottom = pane ? Math.min(pane.bottom - 8, coveredBottom) : coveredBottom
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
