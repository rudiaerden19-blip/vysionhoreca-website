'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

/** Eén scherm, één media-element: volledig zichtbaar (contain), zwarte rand indien nodig. */
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
    }, 400)
  }, [slides.length])

  useEffect(() => {
    setIndex(0)
    setVisible(true)
  }, [slides])

  const current = slides[index] ?? slides[0]
  const loopVideo = slides.length === 1 && current?.type === 'video'
  const fade = visible ? 'opacity-100' : 'opacity-0'

  useEffect(() => {
    if (!current || slides.length <= 1 || current.type === 'video') return
    const id = window.setInterval(advance, IMAGE_MS)
    return () => window.clearInterval(id)
  }, [slides.length, current?.url, current?.type, advance])

  useEffect(() => {
    if (!current || current.type !== 'video') return
    const el = videoRef.current
    if (!el) return
    el.muted = true
    el.currentTime = 0
    void el.play().catch(() => {})
  }, [current?.url, current?.type])

  if (slides.length === 0 || !current) return null

  return (
    <div className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-black">
      <div
        className={`flex h-full w-full max-h-[100dvh] max-w-[100vw] items-center justify-center transition-opacity duration-400 ${fade}`}
      >
        {current.type === 'video' ? (
          <KlantschermVideo
            url={current.url}
            loop={loopVideo}
            videoRef={videoRef}
            onEnded={loopVideo ? undefined : advance}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={current.url}
            alt=""
            className="max-h-full max-w-full object-contain object-center"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  )
}

function KlantschermVideo({
  url,
  loop,
  videoRef,
  onEnded,
}: {
  url: string
  loop: boolean
  videoRef: RefObject<HTMLVideoElement>
  onEnded?: () => void
}) {
  return (
    /* eslint-disable-next-line jsx-a11y/media-has-caption */
    <video
      ref={videoRef}
      key={url}
      src={url}
      muted
      playsInline
      autoPlay
      loop={loop}
      preload="auto"
      className="max-h-full max-w-full object-contain object-center"
      onLoadedData={(e) => {
        e.currentTarget.muted = true
        void e.currentTarget.play().catch(() => {})
      }}
      onEnded={onEnded}
    />
  )
}
