'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

/** Vult het scherm (cover + blur), geen grijze/zwarte balken; voorgrond = volledige promo zonder crop. */
const BLUR_FILL =
  'pointer-events-none absolute left-1/2 top-1/2 min-h-[115%] min-w-[115%] -translate-x-1/2 -translate-y-1/2 object-cover object-center blur-3xl saturate-[1.35]'

function KlantschermSlideshowSlideView({
  slide,
  visible,
  videoRef,
  onVideoEnded,
  onVideoError,
}: {
  slide: KlantschermSlideshowSlide
  visible: boolean
  videoRef?: RefObject<HTMLVideoElement>
  onVideoEnded?: () => void
  onVideoError?: () => void
}) {
  const fade = visible ? 'opacity-100' : 'opacity-0'

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {slide.type === 'video' ? (
        <>
          <div className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ${fade}`} aria-hidden>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              key={`${slide.url}-bg`}
              src={slide.url}
              muted
              playsInline
              autoPlay
              tabIndex={-1}
              className={BLUR_FILL}
            />
          </div>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${fade}`}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              key={slide.url}
              src={slide.url}
              muted
              playsInline
              autoPlay
              className="max-h-full max-w-full object-contain object-center"
              onEnded={onVideoEnded}
              onError={onVideoError}
            />
          </div>
        </>
      ) : (
        <>
          <div className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ${fade}`} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${slide.url}-bg`}
              src={slide.url}
              alt=""
              className={BLUR_FILL}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${fade}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={slide.url}
              src={slide.url}
              alt=""
              className="max-h-full max-w-full object-contain object-center"
              referrerPolicy="no-referrer"
            />
          </div>
        </>
      )}
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
      <KlantschermSlideshowSlideView
        slide={current}
        visible={visible}
        videoRef={videoRef}
        onVideoEnded={advance}
        onVideoError={advance}
      />
    </div>
  )
}
