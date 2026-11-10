import {
  isKassaAzertyOskManualOpenEnabled,
  readKassaOskFieldValue,
} from '@/lib/kassa-azerty-osk'

export const KASSA_OSK_LINE_SHORTCUT_SLOTS = 10
export const KASSA_OSK_LINE_SHORTCUT_MAX_LEN = 15
export const KASSA_OSK_LINE_NOTE_ATTR = 'data-kassa-osk-line-note'

export function isKassaOskLineShortcutsEnabled(tenantSlug: string): boolean {
  return isKassaAzertyOskManualOpenEnabled(tenantSlug)
}

export function isKassaOskLineNoteField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.getAttribute(KASSA_OSK_LINE_NOTE_ATTR) === 'true'
}

export function isKassaHorecaPosPath(pathname: string): boolean {
  const path = (pathname || '').split('?')[0]
  return /\/shop\/[^/]+\/admin\/kassa(?:\/|$)/.test(path)
}

export function normalizeKassaOskLineShortcuts(raw: unknown): string[] {
  const base = Array.from({ length: KASSA_OSK_LINE_SHORTCUT_SLOTS }, () => '')
  if (!Array.isArray(raw)) return base
  raw.slice(0, KASSA_OSK_LINE_SHORTCUT_SLOTS).forEach((item, index) => {
    if (typeof item !== 'string') return
    base[index] = sanitizeKassaOskLineShortcutLabel(item)
  })
  return base
}

export function sanitizeKassaOskLineShortcutLabel(value: string): string {
  return value.trim().slice(0, KASSA_OSK_LINE_SHORTCUT_MAX_LEN)
}

function writeNativeShortcutValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  next: string,
): void {
  const inputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  const textareaValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
    ?.set
  if (el instanceof HTMLInputElement && inputValueSetter) {
    inputValueSetter.call(el, next)
  } else if (el instanceof HTMLTextAreaElement && textareaValueSetter) {
    textareaValueSetter.call(el, next)
  } else {
    el.value = next
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Voeg sneltekst toe in regel-opmerking (spatie ertussen indien nodig). */
export function applyKassaOskLineShortcut(
  el: HTMLInputElement | HTMLTextAreaElement,
  shortcut: string,
): void {
  const trimmed = sanitizeKassaOskLineShortcutLabel(shortcut)
  if (!trimmed) return

  const max = el.maxLength > 0 ? el.maxLength : undefined
  const value = readKassaOskFieldValue(el)
  const selStart = el.selectionStart ?? value.length
  const selEnd = el.selectionEnd ?? value.length
  const before = value.slice(0, selStart)
  const after = value.slice(selEnd)
  const needSpace = before.length > 0 && !/\s$/.test(before)
  let insert = `${needSpace ? ' ' : ''}${trimmed}`
  let next = `${before}${insert}${after}`
  if (max !== undefined && next.length > max) {
    next = next.slice(0, max)
  }
  writeNativeShortcutValue(el, next)
  const caret = Math.min(next.length, before.length + insert.length)
  try {
    el.setSelectionRange(caret, caret)
  } catch {
    /* readOnly safety */
  }
}
