/** Camera barcode scan for retail product intake (Safari/iOS has no BarcodeDetector). */

import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
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

type VideoTrackCaps = MediaTrackCapabilities & {
  focusMode?: string[]
  torch?: boolean
}

function getVideoTrack(stream: MediaStream): MediaStreamTrack | null {
  return stream.getVideoTracks()[0] ?? null
}

export function isRetailCameraTorchAvailable(stream: MediaStream | null): boolean {
  const track = stream ? getVideoTrack(stream) : null
  if (!track?.getCapabilities) return false
  const caps = track.getCapabilities() as VideoTrackCaps
  return caps.torch === true
}

export async function setRetailCameraTorch(
  stream: MediaStream | null,
  on: boolean,
): Promise<void> {
  const track = stream ? getVideoTrack(stream) : null
  if (!track) return
  try {
    await track.applyConstraints({ advanced: [{ torch: on }] as unknown as MediaTrackConstraintSet[] })
  } catch {
    try {
      await track.applyConstraints({ torch: on } as MediaTrackConstraints)
    } catch {
      /* torch niet ondersteund */
    }
  }
}

export async function configureRetailIntakeCameraTrack(stream: MediaStream): Promise<void> {
  const track = getVideoTrack(stream)
  if (!track) return

  try {
    await track.applyConstraints({
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
    })
  } catch {
    /* device kiest zelf */
  }

  const caps = track.getCapabilities?.() as VideoTrackCaps | undefined
  if (caps?.focusMode?.includes('continuous')) {
    try {
      await track.applyConstraints({
        advanced: [{ focusMode: 'continuous' }] as unknown as MediaTrackConstraintSet[],
      })
    } catch {
      /* noop */
    }
  }
}

/** Tik-op-scherpstellen (vooral iPhone). */
export async function refocusRetailCameraStream(stream: MediaStream | null): Promise<void> {
  const track = stream ? getVideoTrack(stream) : null
  if (!track?.getCapabilities) return
  const caps = track.getCapabilities() as VideoTrackCaps
  const modes = caps.focusMode ?? []
  try {
    if (modes.includes('single-shot')) {
      await track.applyConstraints({
        advanced: [{ focusMode: 'single-shot' }] as unknown as MediaTrackConstraintSet[],
      })
      await new Promise((r) => window.setTimeout(r, 450))
    }
    if (modes.includes('continuous')) {
      await track.applyConstraints({
        advanced: [{ focusMode: 'continuous' }] as unknown as MediaTrackConstraintSet[],
      })
    }
  } catch {
    /* noop */
  }
}

export async function attachEnvironmentCameraToVideo(
  video: HTMLVideoElement,
): Promise<MediaStream> {
  prepareIntakeScanVideoElement(video)
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
    },
    audio: false,
  })
  await configureRetailIntakeCameraTrack(stream)
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
    window.setTimeout(onMeta, 1200)
  })

  await refocusRetailCameraStream(stream)
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

function buildEanHints(tryHarder: boolean): Map<DecodeHintType, unknown> {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
  ])
  if (tryHarder) hints.set(DecodeHintType.TRY_HARDER, true)
  return hints
}

function decodeCanvasWithReader(
  canvas: HTMLCanvasElement,
  reader: MultiFormatOneDReader,
  useGlobalBinarizer: boolean,
): string | null {
  try {
    const source = new HTMLCanvasElementLuminanceSource(canvas)
    const binarizer = useGlobalBinarizer
      ? new GlobalHistogramBinarizer(source)
      : new HybridBinarizer(source)
    const bitmap = new BinaryBitmap(binarizer)
    return reader.decode(bitmap).getText() || null
  } catch {
    return null
  }
}

type CanvasRotationDeg = 0 | 90 | 270

let sharedRotateCanvas: HTMLCanvasElement | null = null
let sharedRotateCtx: CanvasRenderingContext2D | null = null

function getRotateCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null
  if (!sharedRotateCanvas) {
    sharedRotateCanvas = document.createElement('canvas')
    sharedRotateCtx = sharedRotateCanvas.getContext('2d', { willReadFrequently: true })
  }
  if (!sharedRotateCtx) return null
  return { canvas: sharedRotateCanvas, ctx: sharedRotateCtx }
}

function drawCanvasRotated(
  src: HTMLCanvasElement,
  degrees: CanvasRotationDeg,
): HTMLCanvasElement {
  if (degrees === 0) return src
  const pair = getRotateCanvas()
  if (!pair) return src
  const { canvas: dest, ctx } = pair
  const w = src.width
  const h = src.height
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  if (degrees === 90) {
    dest.width = h
    dest.height = w
    ctx.clearRect(0, 0, dest.width, dest.height)
    ctx.translate(dest.width, 0)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(src, 0, 0)
  } else {
    dest.width = h
    dest.height = w
    ctx.clearRect(0, 0, dest.width, dest.height)
    ctx.translate(0, dest.height)
    ctx.rotate(-Math.PI / 2)
    ctx.drawImage(src, 0, 0)
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return dest
}

function decodeCanvasAllOrientations(
  canvas: HTMLCanvasElement,
  reader: MultiFormatOneDReader,
  rotations: CanvasRotationDeg[],
): string | null {
  for (const deg of rotations) {
    const sample = drawCanvasRotated(canvas, deg)
    const raw =
      decodeCanvasWithReader(sample, reader, false) ??
      decodeCanvasWithReader(sample, reader, true)
    if (raw) return raw
  }
  return null
}

function drawVideoCropToCanvas(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  mode: 'center' | 'full' | 'vertical',
): void {
  const vw = video.videoWidth
  const vh = video.videoHeight
  const maxW = 1920
  const scale = Math.min(1, maxW / vw)
  const dw = Math.max(1, Math.floor(vw * scale))
  const dh = Math.max(1, Math.floor(vh * scale))
  if (canvas.width !== dw || canvas.height !== dh) {
    canvas.width = dw
    canvas.height = dh
  }
  ctx.imageSmoothingEnabled = false
  if (mode === 'center') {
    const cropW = vw * 0.88
    const cropH = vh * 0.38
    const sx = (vw - cropW) / 2
    const sy = (vh - cropH) / 2
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, dw, dh)
  } else if (mode === 'vertical') {
    const cropW = vw * 0.36
    const cropH = vh * 0.9
    const sx = (vw - cropW) / 2
    const sy = (vh - cropH) / 2
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, dw, dh)
  } else {
    ctx.drawImage(video, 0, 0, dw, dh)
  }
}

/** Snelle 1D-decode — meerdere crops/binarisatie per frame. */
export function startFastEanVideoScan(
  video: HTMLVideoElement,
  isActive: () => boolean,
  onCode: (raw: string) => void,
): RetailBarcodeCameraScanStop {
  const readerFast = new MultiFormatOneDReader(buildEanHints(false))
  const readerHard = new MultiFormatOneDReader(buildEanHints(true))
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  let rafId = 0
  let lastAttempt = 0
  let frameToggle = 0
  const minIntervalMs = 48

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

    if (video.videoWidth < 80 || video.videoHeight < 80) {
      rafId = requestAnimationFrame(loop)
      return
    }

    frameToggle += 1
    const cropModes: Array<'center' | 'full' | 'vertical'> =
      frameToggle % 3 === 0
        ? ['vertical', 'center']
        : frameToggle % 2 === 0
          ? ['center', 'full']
          : ['full', 'center']
    const rotations: CanvasRotationDeg[] =
      frameToggle % 3 === 1 ? [0, 90] : frameToggle % 3 === 2 ? [0, 270] : [0, 90, 270]
    const useHard = frameToggle % 5 === 0
    const reader = useHard ? readerHard : readerFast

    for (const mode of cropModes) {
      drawVideoCropToCanvas(ctx, video, canvas, mode)
      const raw = decodeCanvasAllOrientations(canvas, reader, rotations)
      if (raw) {
        onCode(raw)
        return
      }
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

/** Scherpe foto (iPhone) — decode static frame. */
export async function decodeEanFromImageFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    const tries: Array<{ sx: number; sy: number; sw: number; sh: number }> = [
      { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height },
      {
        sx: bitmap.width * 0.06,
        sy: bitmap.height * 0.28,
        sw: bitmap.width * 0.88,
        sh: bitmap.height * 0.38,
      },
      {
        sx: bitmap.width * 0.32,
        sy: bitmap.height * 0.05,
        sw: bitmap.width * 0.36,
        sh: bitmap.height * 0.9,
      },
    ]

    const reader = new MultiFormatOneDReader(buildEanHints(true))
    const rotations: CanvasRotationDeg[] = [0, 90, 270]
    for (const crop of tries) {
      const maxW = 2400
      const scale = Math.min(1, maxW / crop.sw)
      canvas.width = Math.max(1, Math.floor(crop.sw * scale))
      canvas.height = Math.max(1, Math.floor(crop.sh * scale))
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        bitmap,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        canvas.width,
        canvas.height,
      )
      const raw = decodeCanvasAllOrientations(canvas, reader, rotations)
      if (raw) return raw
    }
    return null
  } finally {
    bitmap?.close()
  }
}

/** ZXing fallback (iOS Safari). */
export async function startZxingBarcodeVideoScan(
  video: HTMLVideoElement,
  isActive: () => boolean,
  onCode: (raw: string) => void,
): Promise<RetailBarcodeCameraScanStop> {
  prepareIntakeScanVideoElement(video)
  return startFastEanVideoScan(video, isActive, onCode)
}
