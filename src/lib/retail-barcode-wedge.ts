/**
 * USB/Bluetooth-handscanner typt als een toetsenbord.
 * De tekens komen vaak sneller dan een mens typt, en eindigen op Enter of Tab.
 * Zonder Enter wachten we kort en nemen we de burst toch aan.
 */

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

export function normalizeRetailWedgeCode(raw: string): string {
  return raw.replace(CONTROL_CHARS, '').trim()
}

export type RetailWedgePushResult = 'ignore' | 'buffer' | 'consumed'

export function createRetailWedgeSession(opts: {
  onScan: (code: string) => void
  charGapMs?: number
  flushDelayMs?: number
  minEnterLength?: number
  minBurstLength?: number
}) {
  const charGapMs = opts.charGapMs ?? 280
  const flushDelayMs = opts.flushDelayMs ?? 160
  const minEnterLength = opts.minEnterLength ?? 3
  const minBurstLength = opts.minBurstLength ?? 6

  let buffer = ''
  let lastAt = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function take(minLength: number) {
    clearTimer()
    const code = normalizeRetailWedgeCode(buffer)
    buffer = ''
    lastAt = 0
    if (code.length >= minLength) opts.onScan(code)
  }

  return {
    pushKey(key: string, now = Date.now()): RetailWedgePushResult {
      if (key === 'Enter' || key === 'NumpadEnter' || key === 'Tab') {
        take(minEnterLength)
        return 'consumed'
      }
      if (key.length !== 1) return 'ignore'
      if (lastAt > 0 && now - lastAt > charGapMs) {
        buffer = ''
        clearTimer()
      }
      buffer += key
      lastAt = now
      clearTimer()
      timer = setTimeout(() => take(minBurstLength), flushDelayMs)
      return 'buffer'
    },
    dispose() {
      clearTimer()
      buffer = ''
    },
  }
}
