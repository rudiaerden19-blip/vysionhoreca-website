'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

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
      {current.type === 'video' ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          key={current.url}
          src={current.url}
          muted
          playsInline
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          onEnded={advance}
          onError={advance}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current.url}
          src={current.url}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  )
}
