'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/i18n'

export type HardwareVideoConfig = {
  src: string
  altKey: string
  fullSrc?: string
  poster?: string
}

export const BEEST_HARDWARE_VIDEOS: HardwareVideoConfig[] = [
  {
    src: '/images/sunmi-d3-pro-inline.mp4',
    fullSrc: '/images/sunmi-d3-pro-display.mp4',
    poster: '/images/sunmi-d3-pro-poster.jpg',
    altKey: 'whyVysion.videoAltSunmi',
  },
  {
    src: '/images/epson-mseries-receipt-printers-inline.mp4',
    fullSrc: '/images/epson-mseries-receipt-printers.mp4',
    poster: '/images/epson-mseries-receipt-printers-poster.jpg',
    altKey: 'whyVysion.videoAltEpson',
  },
  {
    src: '/images/elopos-video-inline.mp4',
    fullSrc: '/images/elopos-video-display.mp4',
    poster: '/images/elopos-video-poster.jpg',
    altKey: 'whyVysion.videoAltEloPOS',
  },
]

export const WHY_VYSION_HARDWARE_VIDEOS: HardwareVideoConfig[] = [
  {
    src: '/images/vysion-hardware-showcase-inline.mp4',
    fullSrc: '/images/vysion-hardware-showcase.mp4',
    poster: '/images/vysion-hardware-showcase-poster.jpg',
    altKey: 'whyVysion.videoAltShowcase',
  },
  {
    src: '/images/vysion-kassa-platform-inline.mp4',
    fullSrc: '/images/vysion-kassa-platform.mp4',
    poster: '/images/vysion-kassa-platform-poster.jpg',
    altKey: 'whyVysion.videoAltKassaPlatform',
  },
]

function HardwareVideoTile({
  item,
  tileClassName,
  labelClassName,
  fetchPriority,
}: {
  item: HardwareVideoConfig
  tileClassName?: string
  labelClassName?: string
  fetchPriority?: 'high' | 'low' | 'auto'
}) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const tileRef = useRef<HTMLButtonElement>(null)
  const inlineRef = useRef<HTMLVideoElement>(null)
  const modalRef = useRef<HTMLVideoElement>(null)
  const fullSrc = item.fullSrc ?? item.src

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const tile = tileRef.current
    const video = inlineRef.current
    if (!tile || !video) return

    const tryPlay = () => {
      void video.play().catch(() => {})
    }

    video.addEventListener('loadeddata', tryPlay)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            tryPlay()
          } else {
            video.load()
          }
        } else {
          video.pause()
        }
      },
      { rootMargin: '320px 0px', threshold: 0.01 },
    )
    io.observe(tile)

    return () => {
      video.removeEventListener('loadeddata', tryPlay)
      io.disconnect()
    }
  }, [item.src])

  const close = useCallback(() => {
    const modal = modalRef.current
    const inline = inlineRef.current
    if (modal) {
      modal.pause()
      modal.muted = true
    }
    if (inline) {
      inline.muted = true
      void inline.play().catch(() => {})
    }
    setExpanded(false)
  }, [])

  const open = useCallback(() => {
    inlineRef.current?.pause()
    setExpanded(true)
  }, [])

  useEffect(() => {
    if (!expanded) return
    const inline = inlineRef.current
    const modal = modalRef.current
    if (!modal) return
    if (inline && fullSrc === item.src) {
      modal.currentTime = inline.currentTime
    } else {
      modal.currentTime = inline?.currentTime ?? 0
    }
    modal.muted = false
    void modal.play().catch(() => {})
  }, [expanded, fullSrc, item.src])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded, close])

  const label = t(item.altKey)
  const tileClass =
    tileClassName ??
    'group relative w-full aspect-video overflow-hidden rounded-3xl shadow-home-photo ring-1 ring-black/[0.08] bg-[#141414] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'

  return (
    <>
      <button
        ref={tileRef}
        type="button"
        onClick={open}
        className={tileClass}
        aria-label={`${label}. ${t('whyVysion.videoTapToEnlarge')}`}
      >
        <video
          ref={inlineRef}
          src={item.src}
          poster={item.poster}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          // @ts-expect-error fetchPriority is valid on video in modern browsers
          fetchPriority={fetchPriority ?? 'auto'}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
          aria-hidden
        />
        <span
          className={
            labelClassName ??
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-center text-xs font-semibold text-white/95 sm:text-sm'
          }
        >
          {t('whyVysion.videoTapToEnlarge')}
        </span>
      </button>

      {mounted && expanded
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] flex flex-col bg-black"
              role="dialog"
              aria-modal="true"
              aria-label={label}
            >
              <div className="flex shrink-0 items-center justify-end gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t('ui.ariaClose')}
                </button>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <video
                  ref={modalRef}
                  src={fullSrc}
                  loop
                  playsInline
                  controls
                  preload="auto"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export function HardwareVideoStack({
  videos,
  stackClassName = 'flex w-full max-w-[854px] flex-col gap-6 sm:gap-8 mx-auto lg:mx-0',
  getTileClassName,
  labelClassName,
}: {
  videos: HardwareVideoConfig[]
  stackClassName?: string
  getTileClassName?: (index: number) => string | undefined
  labelClassName?: string
}) {
  return (
    <div className={stackClassName}>
      {videos.map((item, index) => (
        <HardwareVideoTile
          key={item.src}
          item={item}
          fetchPriority={index < 2 ? 'high' : 'auto'}
          tileClassName={getTileClassName?.(index)}
          labelClassName={labelClassName}
        />
      ))}
    </div>
  )
}

export function WhyVysionHardwareVideos() {
  return <HardwareVideoStack videos={WHY_VYSION_HARDWARE_VIDEOS} />
}
