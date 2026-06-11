/** Camera barcode scan for retail product intake (Safari/iOS has no BarcodeDetector). */

import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatOneDReader,
  HTMLCanvasElementLuminanceSource,
} from '@zxing/library'

export type RetailBarcodeCameraScanStop = () => void

export function isRetailBarcodeCameraScanAvailable(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

/** Telefoon/tablet: camera i.p.v. Bluetooth-wedge (geen handscanner). */
export function isRetailPhoneCameraScanPreferred(): boolean {
  if (typeof window === 'undefined') return false
  if (!isRetailBarcodeCameraScanAvailable()) return false
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true
    const touch =
      'maxTouchPoints' in navigator && typeof navigator.maxTouchPoints === 'number'
        ? navigator.maxTouchPoints
        : 0
    if (touch > 0 && window.innerWidth < 900) return true
  } catch {
    return false
  }
  return false
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
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  })
  video.srcObject = stream
  await video.play()

  await new Promise<void>((resolve) => {
    if (video.videoWidth > 0) {
      resolve()
      return
    }
    const onMeta = () => {
      video.removeEventListener('loadedmetadata', onMeta)
      resolve()
    }
    video.addEventListener('loadedmetadata', onMeta)
    window.setTimeout(onMeta, 800)
  })

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

function buildEanHints(): Map<DecodeHintType, unknown> {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
  ])
  return hints
}

/** Snelle 1D-decode op downscaled full frame (iPhone / ZXing). */
export function startFastEanVideoScan(
  video: HTMLVideoElement,
  isActive: () => boolean,
  onCode: (raw: string) => void,
): RetailBarcodeCameraScanStop {
  const reader = new MultiFormatOneDReader(buildEanHints())
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  let rafId = 0
  let lastAttempt = 0
  let frameToggle = 0
  const minIntervalMs = 32
  const maxDecodeWidth = 1024

  const loop = (now: number) => {
    if (!isActive()) return
    if (!ctx) {
      rafId = requestAnimationFrame(loop)
      return
    }
    if (now - lastAttempt < minIntervalMs) {
      rafId = requestAnimationFrame(loop)
      return
    }
    lastAttempt = now

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw < 80 || vh < 80) {
      rafId = requestAnimationFrame(loop)
      return
    }

    const scale = Math.min(1, maxDecodeWidth / vw)
    const dw = Math.max(1, Math.floor(vw * scale))
    const dh = Math.max(1, Math.floor(vh * scale))
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw
      canvas.height = dh
    }

    frameToggle += 1
    const zoomCenter = frameToggle % 3 !== 0
    if (zoomCenter) {
      const cropW = vw * 0.92
      const cropH = vh * 0.42
      const sx = (vw - cropW) / 2
      const sy = (vh - cropH) / 2
      ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, dw, dh)
    } else {
      ctx.drawImage(video, 0, 0, dw, dh)
    }

    try {
      const source = new HTMLCanvasElementLuminanceSource(canvas)
      const bitmap = new BinaryBitmap(new HybridBinarizer(source))
      const result = reader.decode(bitmap)
      const raw = result.getText()
      if (raw) {
        onCode(raw)
        return
      }
    } catch {
      /* NotFoundException — volgende frame */
    }

    rafId = requestAnimationFrame(loop)
  }

  rafId = requestAnimationFrame(loop)
  return () => {
    if (rafId) cancelAnimationFrame(rafId)
  }
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

/** ZXing fallback (iOS Safari) — snelle 1D-loop op heel beeld. */
export async function startZxingBarcodeVideoScan(
  video: HTMLVideoElement,
  isActive: () => boolean,
  onCode: (raw: string) => void,
): Promise<RetailBarcodeCameraScanStop> {
  prepareIntakeScanVideoElement(video)
  return startFastEanVideoScan(video, isActive, onCode)
}
