/**
 * Horeca-kassa: vast AZERTY-schermtoetsenbord (pilot tenant lomichillplay).
 * Uitbreiding naar alle tenants: hier of tenant_settings vlag koppelen.
 */

const KASSA_AZERTY_OSK_PILOT_SLUG = 'lomichillplay'

export function isKassaAzertyOskEnabled(tenantSlug: string): boolean {
  return tenantSlug.trim().toLowerCase() === KASSA_AZERTY_OSK_PILOT_SLUG
}

export const KASSA_AZERTY_NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const

/** Belgisch AZERTY (kleine letters) — rijen 2–4. */
export const KASSA_AZERTY_LETTER_ROWS = [
  ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
  ['w', 'x', 'c', 'v', 'b', 'n', ',', '.', '-'],
] as const

const AZERTY_SHIFT_MAP: Record<string, string> = {
  ',': '?',
  '.': ':',
  '-': '_',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '0': '0',
}

export function kassaAzertyKeyDisplay(key: string, shift: boolean): string {
  if (!shift) return key
  const mapped = AZERTY_SHIFT_MAP[key]
  if (mapped) return mapped
  return key.length === 1 ? key.toUpperCase() : key
}

export function isKassaAzertyOskTextTarget(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement {
  if (!target || !(target instanceof HTMLElement)) return false
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false
  if (target.getAttribute('data-kassa-osk-skip') === 'true') return false
  if (target instanceof HTMLInputElement) {
    const type = (target.type || 'text').toLowerCase()
    if (type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'button' || type === 'submit') {
      return false
    }
    if (target.readOnly && target.getAttribute('data-kassa-osk-force') !== 'true') return false
  }
  if (target.disabled) return false
  return true
}

const inputValueSetter =
  typeof window !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    : undefined

const textareaValueSetter =
  typeof window !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    : undefined

export function readKassaOskFieldValue(el: HTMLInputElement | HTMLTextAreaElement): string {
  return el.value
}

function writeNativeValue(el: HTMLInputElement | HTMLTextAreaElement, next: string): void {
  if (el instanceof HTMLInputElement && inputValueSetter) {
    inputValueSetter.call(el, next)
  } else if (el instanceof HTMLTextAreaElement && textareaValueSetter) {
    textareaValueSetter.call(el, next)
  } else {
    el.value = next
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

export function applyKassaAzertyOskEdit(
  el: HTMLInputElement | HTMLTextAreaElement,
  edit: 'backspace' | 'space' | { char: string },
): void {
  const max = el.maxLength > 0 ? el.maxLength : undefined
  let value = readKassaOskFieldValue(el)

  if (edit === 'backspace') {
    value = value.slice(0, -1)
  } else if (edit === 'space') {
    value = `${value} `
  } else {
    value = `${value}${edit.char}`
  }

  if (max !== undefined && value.length > max) {
    value = value.slice(0, max)
  }

  writeNativeValue(el, value)
}

export function armKassaOskInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.readOnly = true
  el.inputMode = 'none'
  el.setAttribute('autocomplete', 'off')
  el.setAttribute('enterkeyhint', 'done')
}

export function disarmKassaOskInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.readOnly = false
  el.removeAttribute('inputMode')
}
