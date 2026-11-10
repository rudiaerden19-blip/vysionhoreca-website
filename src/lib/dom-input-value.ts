/**
 * Programmatisch een `<input>`/ `<textarea>`vullen zodat React controlled state meeloopt.
 * — Zelfde idee als @testing-library/user-event: **HTMLInputElement.prototype.value**-setter,
 *   daarna `_valueTracker.setValue(vorige)`(react-dom `trackValueOnNode`/ issue #10135).
 * — Rechtstreeks `el.value = …`laat op sommige browsers/kiosks de interne tracker achter;
 *   React zet dan bij de volgende commit de oude `value`prop terug → “typt niks”.
 */

/** Zet focus terug op het veld vóór caret-berekening. */
export function focusInputForProgrammaticEdit(
  el: HTMLInputElement | HTMLTextAreaElement,
): void {
  try {
    el.focus({ preventScroll: true })
  } catch {
    try {
      el.focus()
    } catch {
      /* noop */
    }
  }
}

type ValueTracking = { setValue: (v: string) => void }

function getValueTracker(el: HTMLInputElement | HTMLTextAreaElement): ValueTracking | null {
  const t = (el as unknown as { _valueTracker?: ValueTracking })._valueTracker
  return t && typeof t.setValue === 'function'? t : null
}

function setValueViaNativePrototype(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set as
    | ((this: typeof el, v: string) => void)
    | undefined
  if (setter) {
    setter.call(el, value)
  } else {
    el.value = value
  }
}

/** Bubbelt na programmatische wijziging — controlled React-velden (kassa-opmerking). */
export const KASSA_OSK_PROGRAMMATIC_INPUT_EVENT = 'kassa-osk-programmatic-input'

/** Controlled kassa-velden: alleen React-state, geen tussentijdse DOM (voorkomt “flits en weg”). */
export function isKassaOskReactControlledSyncField(el: HTMLElement): boolean {
  return (
    el.getAttribute('data-kassa-osk-line-note') === 'true' ||
    el.getAttribute('data-kassa-osk-shortcut-slot') === 'true'
  )
}

export function dispatchKassaOskProgrammaticValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  el.dispatchEvent(
    new CustomEvent(KASSA_OSK_PROGRAMMATIC_INPUT_EVENT, {
      bubbles: true,
      detail: { value },
    }),
  )
}

/**
 * Zet de DOM-waarde en vuurt één bubbling `input`(klassiek Event — React verwacht deze keten).
 */
export function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const previous = el.value

  try {
    setValueViaNativePrototype(el, value)
  } catch {
    el.value = value
  }

  const tracker = getValueTracker(el)
  if (tracker) {
    try {
      tracker.setValue(previous)
    } catch {
      /* noop */
    }
  }

  try {
    if (typeof InputEvent !== 'undefined') {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    } else {
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  } catch {
    /* noop */
  }

  try {
    el.dispatchEvent(
      new CustomEvent(KASSA_OSK_PROGRAMMATIC_INPUT_EVENT, {
        bubbles: true,
        detail: { value },
      }),
    )
  } catch {
    /* noop */
  }
}
