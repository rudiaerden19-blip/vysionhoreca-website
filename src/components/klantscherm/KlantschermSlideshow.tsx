'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'
import {
  KLANTSCHERM_SLIDE_FRAME_CLASS,
  klantschermSlideBackdropStyle,
} from '@/lib/klantscherm-slideshow-frame'

const IMAGE_MS = 5000

/** Zelfde 16:9-kader voor elke slide; schermrand = wazige fill (geen crop op voorgrond). */
function KlantschermSlideFrame({
  url,
  visible,
  kind,
  videoRef,
  onVideoEnded,
  onVideoError,
}: {
  url: string
  visible: boolean
  kind: 'image' | 'video'
  videoRef?: RefObject<HTMLVideoElement>
  onVideoEnded?: () => void
  onVideoError?: () => void
}) {
  const fade = visible ? 'opacity-100' : 'opacity-0'

  return (
    <div className={`absolute inset-0 overflow-hidden bg-black transition-opacity duration-500 ${fade}`}>
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-3xl saturate-[1.2]"
        style={klantschermSlideBackdropStyle(url)}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-[2vmin]">
        <div className={KLANTSCHERM_SLIDE_FRAME_CLASS}>
          {kind === 'video' ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              ref={videoRef}
              key={url}
              src={url}
              muted
              playsInline
              autoPlay
              preload="auto"
              className="absolute inset-0 h-full w-full object-contain object-center"
              onEnded={onVideoEnded}
              onError={onVideoError}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={url}
              src={url}
              alt=""
              className="absolute inset-0 h-full w-full object-contain object-center"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function KlantschermSlideshow({ slides }: { slides: KlantschermSlideshowSlide[] }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const advance = useCallback(() => {
    if (slides.length <= 1) return
    setVisible(false)
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length)
      setVisible(true)
    }, 450)
  }, [slides.length])

  useEffect(() => {
    setIndex(0)
    setVisible(true)
  }, [slides])

  const current = slides[index] ?? slides[0]

  useEffect(() => {
    if (!current || slides.length <= 1) return
    if (current.type === 'video') return
    const id = window.setInterval(advance, IMAGE_MS)
    return () => window.clearInterval(id)
  }, [slides.length, current?.url, current?.type, advance])

  useEffect(() => {
    if (!current || current.type !== 'video') return
    const el = videoRef.current
    if (!el) return
    el.currentTime = 0
    void el.play().catch(() => {
      advance()
    })
  }, [current?.url, current?.type, advance])

  if (slides.length === 0 || !current) return null

  return (
    <div className="relative min-h-0 w-full flex-1 bg-black">
      <KlantschermSlideFrame
        url={current.url}
        visible={visible}
        kind={current.type}
        videoRef={current.type === 'video' ? videoRef : undefined}
        onVideoEnded={advance}
        onVideoError={advance}
      />
    </div>
  )
}
