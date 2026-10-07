'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

const BLUR_LAYER =
  'pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-110 object-cover blur-[72px] saturate-[1.85] contrast-[1.05]'

function klantschermSlideBackdropStyle(url: string): { backgroundImage: string } {
  const safe = url.replace(/"/g, '%22')
  return { backgroundImage: `url("${safe}")` }
}

/** Foto scherp + vol scherm kleur-blur (geen zwarte balken). */
function KlantschermPhotoSlideView({ url, visible }: { url: string; visible: boolean }) {
  const fade = visible ? 'opacity-100' : 'opacity-0'

  return (
    <div className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ${fade}`}>
      <div
        className="pointer-events-none absolute -inset-[25%] bg-cover bg-center blur-[80px] saturate-[2] contrast-[1.05]"
        style={klantschermSlideBackdropStyle(url)}
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${url}-blur`}
        src={url}
        alt=""
        aria-hidden
        className={BLUR_LAYER}
        referrerPolicy="no-referrer"
      />
      {/* zachte rand — geen zwart vlak in het midden */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_55%,rgba(0,0,0,0.22)_100%)]"
        aria-hidden
      />

      <div className="absolute inset-0 z-10 flex items-center justify-center p-[2vmin]">
        <div className="overflow-hidden rounded-[1.65rem] shadow-[0_24px_70px_rgba(0,0,0,0.45)] ring-2 ring-white/35 sm:rounded-[2rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={url}
            alt=""
            className="block max-h-[88vh] max-w-[94vw] w-auto h-auto object-contain"
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

  return (
    <div className="relative min-h-0 w-full flex-1">
      <KlantschermPhotoSlideView url={current.url} visible={visible} />
    </div>
  )
}
