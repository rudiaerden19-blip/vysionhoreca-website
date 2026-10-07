'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

function klantschermSlideBackdropStyle(url: string): { backgroundImage: string } {
  const safe = url.replace(/"/g, '%22')
  return { backgroundImage: `url("${safe}")` }
}

/** 15″ landscape: vol scherm kleur-blur + foto zo groot mogelijk (≈96% hoogte). */
function KlantschermPhotoSlideView({ url, visible }: { url: string; visible: boolean }) {
  const fade = visible ? 'opacity-100' : 'opacity-0'

  return (
    <div
      className={`fixed inset-0 h-[100dvh] w-screen overflow-hidden transition-opacity duration-500 ${fade}`}
      style={klantschermSlideBackdropStyle(url)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${url}-blur`}
        src={url}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[160%] w-[160%] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-125 object-cover blur-[88px] saturate-[2.1] contrast-[1.08] brightness-105"
        referrerPolicy="no-referrer"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center blur-[96px] saturate-[2.15] contrast-[1.05] brightness-105"
        style={klantschermSlideBackdropStyle(url)}
        aria-hidden
      />

      <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center p-[1.5vmin]">
        <div className="max-h-[96vh] max-w-[98vw] overflow-hidden rounded-[1.75rem] shadow-[0_20px_60px_rgba(0,0,0,0.35)] ring-2 ring-white/40 sm:rounded-[2.25rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={url}
            alt=""
            className="block h-[96vh] w-auto max-w-[98vw] object-contain object-center"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  )
}

export function KlantschermSlideshow({ slides }: { slides: KlantschermSlideshowSlide[] }) {
  const photoSlides = useMemo(
    () => slides.filter((s) => s.type === 'image' && s.url),
    [slides],
  )
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const advance = useCallback(() => {
    if (photoSlides.length <= 1) return
    setVisible(false)
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % photoSlides.length)
      setVisible(true)
    }, 450)
  }, [photoSlides.length])

  useEffect(() => {
    setIndex(0)
    setVisible(true)
  }, [photoSlides])

  const current = photoSlides[index] ?? photoSlides[0]

  useEffect(() => {
    if (!current || photoSlides.length <= 1) return
    const id = window.setInterval(advance, IMAGE_MS)
    return () => window.clearInterval(id)
  }, [photoSlides.length, current?.url, advance])

  if (photoSlides.length === 0 || !current) return null

  return <KlantschermPhotoSlideView url={current.url} visible={visible} />
}
