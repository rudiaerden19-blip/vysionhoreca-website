/**
 * Programmatisch een `<input>` / `<textarea>` vullen zodat React controlled state meeloopt.
 * — Zelfde idee als @testing-library/user-event: **HTMLInputElement.prototype.value**-setter,
 *   daarna `_valueTracker.setValue(vorige)` (react-dom `trackValueOnNode` / issue #10135).
 * — Rechtstreeks `el.value = …` laat op sommige browsers/kiosks de interne tracker achter;
 *   React zet dan bij de volgende commit de oude `value` prop terug → “typt niks”.
 */

/** Zelfde attribuut als TouchScreenKeyboard: velden met schermtoetsenbord niet dubbel muteren (o.a. autocap). */
export const ATTR_VYSION_KB_MANAGED = 'data-vysion-kb-managed'

type ValueTracking = { setValue: (v: string) => void }

function getValueTracker(el: HTMLInputElement | HTMLTextAreaElement): ValueTracking | null {
  const t = (el as unknown as { _valueTracker?: ValueTracking })._valueTracker
  return t && typeof t.setValue === 'function' ? t : null
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

/**
 * Zet de DOM-waarde en vuurt één bubbling `input` (klassiek Event — React verwacht deze keten).
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
    el.dispatchEvent(new Event('input', { bubbles: true }))
  } catch {
    /* noop */
  }
}
