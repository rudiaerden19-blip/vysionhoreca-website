/**
 * Programmatisch een `<input>` / `<textarea>` vullen zodat React controlled state meeloopt.
 * Patroon: eerst `el.value = …` (via React’s eigen descriptor), daarna `tracker.setValue(vorige)` zodat
 * `updateValueIfChanged` in react-dom het verschil ziet (zie react-dom `trackValueOnNode` / issue #10135).
 * Prototype-setter omzeilen gaf op sommige setups een mismatch met de interne tracker.
 */

/** Zelfde attribuut als TouchScreenKeyboard: velden met schermtoetsenbord niet dubbel muteren (o.a. autocap). */
export const ATTR_VYSION_KB_MANAGED = 'data-vysion-kb-managed'

type ValueTracking = { setValue: (v: string) => void }

function getValueTracker(el: HTMLInputElement | HTMLTextAreaElement): ValueTracking | null {
  const t = (el as unknown as { _valueTracker?: ValueTracking })._valueTracker
  return t && typeof t.setValue === 'function' ? t : null
}

/**
 * Zet de DOM-waarde en vuurt één `input`-event (bubble).
 */
export function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const previous = el.value
  el.value = value
  if (el.value !== value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) {
      ;(setter as (this: typeof el, v: string) => void).call(el, value)
    }
  }
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
