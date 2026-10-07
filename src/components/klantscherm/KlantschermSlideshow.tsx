'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { KlantschermSlideshowSlide } from '@/lib/klantscherm-slideshow-server'

const IMAGE_MS = 5000

const FRAME_CLASS =
  'relative overflow-hidden rounded-[1.75rem] bg-black/30 shadow-[0_28px_90px_rgba(0,0,0,0.72)] ring-1 ring-white/20 backdrop-blur-[2px] sm:rounded-[2rem]'

const MEDIA_IN_FRAME_CLASS =
  'block max-h-[86vh] max-w-[min(94vw,120rem)] w-auto h-auto object-contain'

function klantschermSlideBackdropStyle(url: string): { backgroundImage: string } {
  const safe = url.replace(/"/g, '%22')
  return { backgroundImage: `url("${safe}")` }
}

function tryPlayVideo(el: HTMLVideoElement) {
  el.muted = true
  el.playsInline = true
  void el.play().catch(() => {
    window.setTimeout(() => void el.play().catch(() => {}), 400)
  })
}

/** Vol scherm ambient blur + voorgrond in afgerond kader (pro look). */
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
    <div className={`absolute inset-0 overflow-hidden bg-zinc-950 transition-opacity duration-500 ${fade}`}>
      {slide.type === 'video' ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
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
            className="absolute left-1/2 top-1/2 h-full min-h-full w-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-125 object-cover blur-3xl saturate-[1.35] brightness-90"
            onLoadedData={(e) => wirePlay(e.currentTarget)}
            onCanPlay={(e) => wirePlay(e.currentTarget)}
          />
        </div>
      ) : (
        <>
          <div
            className="pointer-events-none absolute -inset-[18%] scale-110 bg-cover bg-center blur-3xl saturate-[1.4] brightness-95"
            style={klantschermSlideBackdropStyle(slide.url)}
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${slide.url}-bg`}
            src={slide.url}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-full min-h-full w-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-125 object-cover blur-3xl saturate-[1.35] brightness-90"
            referrerPolicy="no-referrer"
          />
        </>
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/75 via-zinc-950/45 to-black/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_72%,rgba(0,0,0,0.88)_100%)]"
        aria-hidden
      />

      <div className="absolute inset-0 z-10 flex items-center justify-center p-[2.5vmin] sm:p-[3.5vmin]">
        <div className={FRAME_CLASS}>
          {slide.type === 'video' ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              ref={videoRef}
              key={slide.url}
              src={slide.url}
              muted
              playsInline
              autoPlay
              loop={loopVideo}
              preload="auto"
              className={MEDIA_IN_FRAME_CLASS}
              onLoadedData={(e) => wirePlay(e.currentTarget)}
              onCanPlay={(e) => wirePlay(e.currentTarget)}
              onEnded={loopVideo ? undefined : onVideoEnded}
              onError={onVideoError}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={slide.url}
              src={slide.url}
              alt=""
              className={MEDIA_IN_FRAME_CLASS}
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
    <div className="relative min-h-0 w-full flex-1 bg-zinc-950">
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
