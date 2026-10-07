'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

/** Volledige promo zichtbaar (geen crop), randen opgevuld met wazige laag — geen zwarte balken. */
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
  const backdrop =
    'pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-center blur-2xl brightness-[0.55] saturate-125'
  const front =
    'relative z-10 h-full w-full max-h-full max-w-full object-contain object-center transition-opacity duration-500'

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {slide.type === 'video' ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            key={`${slide.url}-bg`}
            src={slide.url}
            muted
            playsInline
            autoPlay
            tabIndex={-1}
            aria-hidden
            className={`${backdrop} transition-opacity duration-500 ${fade}`}
          />
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            key={slide.url}
            src={slide.url}
            muted
            playsInline
            autoPlay
            className={`absolute inset-0 z-10 m-auto ${front} ${fade}`}
            onEnded={onVideoEnded}
            onError={onVideoError}
          />
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${slide.url}-bg`}
            src={slide.url}
            alt=""
            aria-hidden
            className={`${backdrop} transition-opacity duration-500 ${fade}`}
            referrerPolicy="no-referrer"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={slide.url}
            src={slide.url}
            alt=""
            className={`absolute inset-0 z-10 m-auto h-full w-full ${front} ${fade}`}
            referrerPolicy="no-referrer"
          />
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
    <div className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-black">
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
