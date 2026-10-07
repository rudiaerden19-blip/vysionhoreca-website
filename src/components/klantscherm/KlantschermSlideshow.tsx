'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

/** Volledige foto zichtbaar; rand vult met dezelfde afbeelding (geen crop, geen lege balk). */
function KlantschermPromoImage({ url, visible }: { url: string; visible: boolean }) {
  const fade = visible ? 'opacity-100' : 'opacity-0'
  return (
    <div className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ${fade}`}>
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl saturate-[1.25]"
        style={{ backgroundImage: `url("${url.replace(/"/g, '%22')}")` }}
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="relative z-10 mx-auto h-full w-full object-contain object-center"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}

function KlantschermPromoVideo({
  url,
  visible,
  videoRef,
  onVideoEnded,
  onVideoError,
}: {
  url: string
  visible: boolean
  videoRef?: RefObject<HTMLVideoElement>
  onVideoEnded?: () => void
  onVideoError?: () => void
}) {
  const fade = visible ? 'opacity-100' : 'opacity-0'
  return (
    <div className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ${fade}`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        key={url}
        src={url}
        muted
        playsInline
        autoPlay
        preload="auto"
        className="max-h-full max-w-full object-contain object-center"
        onEnded={onVideoEnded}
        onError={onVideoError}
      />
    </div>
  )
}

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
  if (slide.type === 'video') {
    return (
      <KlantschermPromoVideo
        url={slide.url}
        visible={visible}
        videoRef={videoRef}
        onVideoEnded={onVideoEnded}
        onVideoError={onVideoError}
      />
    )
  }
  return <KlantschermPromoImage url={slide.url} visible={visible} />
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
