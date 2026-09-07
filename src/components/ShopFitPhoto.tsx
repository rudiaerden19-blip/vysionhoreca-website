'use client'

import { useEffect, useState } from 'react'
import { contentBoundsFromRgba, type ImageContentBounds } from '@/lib/image-content-bounds'

type Props = {
  src: string
  alt: string
  className?: string
}

type Crop = ImageContentBounds & { naturalWidth: number; naturalHeight: number }

function readContentCrop(img: HTMLImageElement): Crop | null {
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) return null
  const maxW = 240
  const scale = w > maxW ? maxW / w : 1
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, cw, ch)
  const { data } = ctx.getImageData(0, 0, cw, ch)
  const box = contentBoundsFromRgba(data, cw, ch)
  const inv = 1 / scale
  return {
    left: box.left * inv,
    top: box.top * inv,
    width: box.width * inv,
    height: box.height * inv,
    naturalWidth: w,
    naturalHeight: h,
  }
}

/** Shop-foto: vak volgt de echte inhoud, zwarte letterbox valt weg. Hoogtes mogen verschillen. */
export function ShopFitPhoto({ src, alt, className = '' }: Props) {
  const [crop, setCrop] = useState<Crop | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setCrop(null)
    const finish = (next: Crop | null) => {
      if (cancelled) return
      setCrop(next)
      setReady(true)
    }
    const apply = (el: HTMLImageElement) => {
      try {
        finish(readContentCrop(el))
      } catch {
        finish(null)
      }
    }
    const probe = new window.Image()
    probe.onload = () => apply(probe)
    probe.onerror = () => {
      const fallback = new window.Image()
      fallback.crossOrigin = 'anonymous'
      fallback.onload = () => apply(fallback)
      fallback.onerror = () => finish(null)
      fallback.src = src
    }
    probe.src = `/_next/image?url=${encodeURIComponent(src)}&w=384&q=40`
    return () => {
      cancelled = true
    }
  }, [src])

  if (!ready) {
    return <div className={`w-full bg-white aspect-[16/10] ${className}`.trim()} aria-hidden />
  }

  if (!crop) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`block h-auto w-full ${className}`.trim()} />
    )
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`.trim()}
      style={{ aspectRatio: `${crop.width} / ${crop.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute max-w-none"
        style={{
          width: `${(crop.naturalWidth / crop.width) * 100}%`,
          height: `${(crop.naturalHeight / crop.height) * 100}%`,
          left: `${(-crop.left / crop.width) * 100}%`,
          top: `${(-crop.top / crop.height) * 100}%`,
        }}
      />
    </div>
  )
}
