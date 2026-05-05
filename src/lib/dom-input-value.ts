/**
 * Programmatisch een `<input>` / `<textarea>` vullen zodat React controlled state meeloopt.
 * Zie o.a. https://github.com/facebook/react/issues/10135 — native `value`-setter + interne _valueTracker.
 */

/** Zelfde attribuut als TouchScreenKeyboard: velden met schermtoetsenbord niet dubbel muteren (o.a. autocap). */
export const ATTR_VYSION_KB_MANAGED = 'data-vysion-kb-managed'

type ValueTracking = { setValue: (v: string) => void }

function getValueTracker(el: HTMLInputElement | HTMLTextAreaElement): ValueTracking | null {
  const t = (el as unknown as { _valueTracker?: ValueTracking })._valueTracker
  return t && typeof t.setValue === 'function' ? t : null
}

function setValueNative(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) {
    setter.call(el, value)
  } else {
    el.value = value
  }
}

/**
 * Zet de DOM-waarde en vuurt één `input`-event (bubble). Geen apart `change`-event:
 * React koppelt `onChange` voor tekstvelden aan `input` en dubbele events kunnen ruis geven.
 */
export function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const previous = el.value
  setValueNative(el, value)

  const tracker = getValueTracker(el)
  if (tracker) {
    try {
      tracker.setValue(previous)
    } catch {
      /* noop */
    }
  }

  el.dispatchEvent(new Event('input', { bubbles: true }))
}
