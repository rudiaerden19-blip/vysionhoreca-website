/** Geluid + trilling na geslaagde retail-barcode (intake / scanner). */

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const W = window as Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? W.webkitAudioContext
    if (!Ctor) return null
    if (!sharedAudioCtx) sharedAudioCtx = new Ctor()
    return sharedAudioCtx
  } catch {
    return null
  }
}

/** Na gebruikersactie (camera start) — iOS Safari vereist dit vóór piep. */
export function primeRetailBarcodeScanAudio(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
}

function playSuccessBeep(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => playSuccessBeep()).catch(() => {})
    return
  }

  const t0 = ctx.currentTime
  const tone = (freq: number, start: number, duration: number, volume = 0.14) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t0 + start)
    gain.gain.setValueAtTime(0.0001, t0 + start)
    gain.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0 + start)
    osc.stop(t0 + start + duration + 0.03)
  }

  tone(880, 0, 0.07, 0.12)
  tone(1174, 0.08, 0.11, 0.1)
}

function pulseVibration(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate([35, 40, 35])
  } catch {
    /* noop */
  }
}

export function playRetailBarcodeScanSuccessFeedback(): void {
  pulseVibration()
  playSuccessBeep()
}
