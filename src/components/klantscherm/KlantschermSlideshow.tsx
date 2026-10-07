'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

const BACKDROP_CLASS =
  'pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-center blur-2xl brightness-[0.55] saturate-125'
const FRONT_CLASS =
  'absolute inset-0 z-10 m-auto h-full w-full max-h-full max-w-full object-contain object-center'

function tryPlayVideo(el: HTMLVideoElement) {
  el.muted = true
  el.playsInline = true
  void el.play().catch(() => {
    window.setTimeout(() => void el.play().catch(() => {}), 400)
  })
}

/** Volledige promo zichtbaar (geen crop); randen opgevuld met wazige laag — geen zwarte balken. */
function KlantschermSlideshowSlideView({
  slide,
  visible,
  loopVideo,
  videoRef,
  onVideoEnded,
  onVideoError,
}: {
  slide: KlantschermSlideshowSlide
  visible: boolean
  loopVideo: boolean
  videoRef?: RefObject<HTMLVideoElement>
  onVideoEnded?: () => void
  onVideoError?: () => void
}) {
  const fade = visible ? 'opacity-100' : 'opacity-0'

  const wirePlay = (el: HTMLVideoElement) => {
    tryPlayVideo(el)
  }

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
            loop={loopVideo}
            preload="auto"
            tabIndex={-1}
            aria-hidden
            className={`${BACKDROP_CLASS} transition-opacity duration-500 ${fade}`}
            onLoadedData={(e) => wirePlay(e.currentTarget)}
            onCanPlay={(e) => wirePlay(e.currentTarget)}
          />
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            key={slide.url}
            src={slide.url}
            muted
            playsInline
            autoPlay
            loop={loopVideo}
            preload="auto"
            className={`${FRONT_CLASS} transition-opacity duration-500 ${fade}`}
            onLoadedData={(e) => wirePlay(e.currentTarget)}
            onCanPlay={(e) => wirePlay(e.currentTarget)}
            onEnded={loopVideo ? undefined : onVideoEnded}
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
            className={`${BACKDROP_CLASS} transition-opacity duration-500 ${fade}`}
            referrerPolicy="no-referrer"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={slide.url}
            src={slide.url}
            alt=""
            className={`${FRONT_CLASS} transition-opacity duration-500 ${fade}`}
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
  const loopVideo = slides.length === 1 && current?.type === 'video'

  useEffect(() => {
    if (!current || slides.length <= 1 || current.type === 'video') return
    const id = window.setInterval(advance, IMAGE_MS)
    return () => window.clearInterval(id)
  }, [slides.length, current?.url, current?.type, advance])

  useEffect(() => {
    if (!current || current.type !== 'video') return
    const el = videoRef.current
    if (!el) return
    el.currentTime = 0
    tryPlayVideo(el)
  }, [current?.url, current?.type])

  if (slides.length === 0 || !current) return null

  return (
    <div className="relative min-h-0 w-full flex-1 bg-black">
      <KlantschermSlideshowSlideView
        slide={current}
        visible={visible}
        loopVideo={loopVideo}
        videoRef={videoRef}
        onVideoEnded={advance}
        onVideoError={() => {
          const el = videoRef.current
          if (el) tryPlayVideo(el)
        }}
      />
    </div>
  )
}
