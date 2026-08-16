/** Eén hardware-inline tegel tegelijk laten beginnen met downloaden — voorkomt 5× concurrent op de homepage. */
let chain: Promise<void> = Promise.resolve()

const STAGGER_MS = 180

export function scheduleHardwareInlineLoad(start: () => void): void {
  chain = chain.then(
    () =>
      new Promise<void>((resolve) => {
        start()
        window.setTimeout(resolve, STAGGER_MS)
      }),
  )
}
