/** Camera barcode scan for retail product intake (Safari/iOS has no BarcodeDetector). */

export type RetailBarcodeCameraScanStop = () => void

export function isRetailBarcodeCameraScanAvailable(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

export function prepareIntakeScanVideoElement(video: HTMLVideoElement): void {
  video.setAttribute('playsinline', 'true')
  video.setAttribute('muted', 'true')
  video.setAttribute('autoplay', 'true')
  video.playsInline = true
  video.muted = true
}

export async function attachEnvironmentCameraToVideo(
  video: HTMLVideoElement,
): Promise<MediaStream> {
  prepareIntakeScanVideoElement(video)
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  })
  video.srcObject = stream
  await video.play()
  return stream
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>
}

export function getNativeBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
  return w.BarcodeDetector ?? null
}

export function startNativeBarcodeDetectorLoop(
  video: HTMLVideoElement,
  isActive: () => boolean,
  onCode: (raw: string) => void,
): RetailBarcodeCameraScanStop {
  const Ctor = getNativeBarcodeDetectorCtor()
  if (!Ctor) return () => {}
  const detector = new Ctor({
    formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'],
  })
  let rafId: number | null = null
  const tick = async () => {
    if (!isActive()) return
    try {
      const codes = await detector.detect(video)
      const raw = codes[0]?.rawValue
      if (raw) {
        onCode(raw)
        return
      }
    } catch {
      /* frame miss */
    }
    if (isActive()) {
      rafId = requestAnimationFrame(() => {
        void tick()
      })
    }
  }
  rafId = requestAnimationFrame(() => {
    void tick()
  })
  return () => {
    if (rafId != null) cancelAnimationFrame(rafId)
  }
}

/** ZXing scan loop on an already-playing video (iOS Safari). */
export async function startZxingBarcodeVideoScan(
  video: HTMLVideoElement,
  isActive: () => boolean,
  onCode: (raw: string) => void,
): Promise<RetailBarcodeCameraScanStop> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.CODE_128,
  ])
  const reader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 180,
    delayBetweenScanSuccess: 400,
  })
  prepareIntakeScanVideoElement(video)
  const controls = reader.scan(video, (result, _err, scanControls) => {
    if (!isActive() || !result) return
    const raw = result.getText()
    if (raw) {
      onCode(raw)
      scanControls.stop()
    }
  })
  return () => controls.stop()
}
