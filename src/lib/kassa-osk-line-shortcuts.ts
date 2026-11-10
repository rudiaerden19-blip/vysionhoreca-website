import { setNativeInputValue } from '@/lib/dom-input-value'
import { isKassaAzertyOskManualOpenEnabled, readKassaOskFieldValue } from '@/lib/kassa-azerty-osk'

export const KASSA_OSK_LINE_SHORTCUT_SLOTS = 10
export const KASSA_OSK_LINE_SHORTCUT_MAX_LEN = 15
export const KASSA_OSK_LINE_NOTE_ATTR = 'data-kassa-osk-line-note'
export const KASSA_OSK_SHORTCUT_SLOT_ATTR = 'data-kassa-osk-shortcut-slot'

/** Geen tenant-whitelist — elke geldige slug op horeca-kassa. */
export function isKassaOskLineShortcutsEnabled(tenantSlug: string): boolean {
  return isKassaAzertyOskManualOpenEnabled(tenantSlug.trim())
}

export function isKassaOskLineNoteField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.getAttribute(KASSA_OSK_LINE_NOTE_ATTR) === 'true'
}

function isOskLineNoteElementVisible(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (!el.isConnected) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/**
 * Doel voor sneltekst › — productopties-modal wint vóór verborgen numpad-opmerking in de zijbalk.
 */
export function findKassaOskLineNoteInput(
  preferred?: HTMLInputElement | HTMLTextAreaElement | null,
): HTMLInputElement | HTMLTextAreaElement | null {
  if (
    preferred?.isConnected &&
    isKassaOskLineNoteField(preferred) &&
    isOskLineNoteElementVisible(preferred)
  ) {
    return preferred
  }

  const optionsModal = document.querySelector('[data-testid="kassa-options-modal"]')
  if (optionsModal instanceof HTMLElement) {
    const inModal = optionsModal.querySelector(`[${KASSA_OSK_LINE_NOTE_ATTR}="true"]`)
    if (inModal instanceof HTMLInputElement || inModal instanceof HTMLTextAreaElement) {
      return inModal
    }
  }

  const candidates = document.querySelectorAll(`[${KASSA_OSK_LINE_NOTE_ATTR}="true"]`)
  for (const node of candidates) {
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) continue
    if (isOskLineNoteElementVisible(node)) return node
  }

  if (preferred?.isConnected && isKassaOskLineNoteField(preferred)) {
    return preferred
  }

  const first = candidates[0]
  if (first instanceof HTMLInputElement || first instanceof HTMLTextAreaElement) {
    return first
  }
  return null
}

export function isKassaOskShortcutSlotField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.getAttribute(KASSA_OSK_SHORTCUT_SLOT_ATTR) === 'true'
}

/** Handmatige OSK-knop uit, maar opmerking-veld focust → toch tonen. */
export function isAdminOskNextFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false
  const root = target.closest('[data-osk-next="true"]')
  return root instanceof HTMLElement
}

export function shouldOpenAzertyOskForFieldFocus(
  manualOpen: boolean,
  keyboardPinned: boolean,
  target: EventTarget | null,
): boolean {
  if (!manualOpen || keyboardPinned) return true
  return (
    isKassaOskLineNoteField(target) ||
    isAdminOskNextFormField(target) ||
    isKassaOskShortcutSlotField(target)
  )
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

/** Tijdens typen in sneltekst-slot: geen trim (spatiebalk mag spaties zetten). */
export function clampKassaOskLineShortcutDraft(value: string): string {
  return value.slice(0, KASSA_OSK_LINE_SHORTCUT_MAX_LEN)
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
  setNativeInputValue(el, next)
  const caret = Math.min(next.length, before.length + insert.length)
  try {
    el.setSelectionRange(caret, caret)
  } catch {
    /* readOnly safety */
  }
}
