'use client'

import { scheduleHardwareInlineLoad } from '@/lib/hardware-video-load-queue'
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
  loadImmediately,
}: {
  item: HardwareVideoConfig
  tileClassName?: string
  labelClassName?: string
  /** Eerste zichtbare tegel op de pagina — start download meteen (via queue). */
  loadImmediately?: boolean
}) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [inlineSrc, setInlineSrc] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const tileRef = useRef<HTMLButtonElement>(null)
  const inlineRef = useRef<HTMLVideoElement>(null)
  const modalRef = useRef<HTMLVideoElement>(null)
  const queuedRef = useRef(false)
  const fullSrc = item.fullSrc ?? item.src

  const requestInlineSrc = useCallback(() => {
    if (queuedRef.current) return
    queuedRef.current = true
    scheduleHardwareInlineLoad(() => setInlineSrc(item.src))
  }, [item.src])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (loadImmediately) requestInlineSrc()
  }, [loadImmediately, requestInlineSrc])

  useEffect(() => {
    if (loadImmediately) return
    const tile = tileRef.current
    if (!tile) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) requestInlineSrc()
      },
      { rootMargin: '80px 0px', threshold: 0.05 },
    )
    io.observe(tile)
    return () => io.disconnect()
  }, [loadImmediately, requestInlineSrc])

  useEffect(() => {
    const video = inlineRef.current
    if (!video || !inlineSrc) return

    const onPlaying = () => setIsPlaying(true)
    const onCanPlay = () => {
      void video.play().catch(() => {})
    }

    video.addEventListener('playing', onPlaying)
    video.addEventListener('canplay', onCanPlay)
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      onCanPlay()
    }

    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('canplay', onCanPlay)
    }
  }, [inlineSrc])

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
    const modal = modalRef.current
    if (!modal) return

    const playFromStart = () => {
      modal.currentTime = 0
      modal.muted = false
      void modal.play().catch(() => {})
    }

    if (modal.readyState >= HTMLMediaElement.HAVE_METADATA) {
      playFromStart()
    } else {
      modal.addEventListener('loadedmetadata', playFromStart, { once: true })
      return () => modal.removeEventListener('loadedmetadata', playFromStart)
    }
  }, [expanded, fullSrc])

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
        {item.poster ? (
          <img
            src={item.poster}
            alt=""
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-150 ${
              isPlaying ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden
            decoding="async"
            fetchPriority={loadImmediately ? 'high' : 'auto'}
          />
        ) : null}
        {inlineSrc ? (
          <video
            ref={inlineRef}
            src={inlineSrc}
            loop
            muted
            playsInline
            preload="auto"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
            aria-hidden
          />
        ) : null}
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
  priorityFirstVideo = false,
}: {
  videos: HardwareVideoConfig[]
  stackClassName?: string
  getTileClassName?: (index: number) => string | undefined
  labelClassName?: string
  priorityFirstVideo?: boolean
}) {
  return (
    <div className={stackClassName}>
      {videos.map((item, index) => (
        <HardwareVideoTile
          key={item.src}
          item={item}
          loadImmediately={priorityFirstVideo && index === 0}
          tileClassName={getTileClassName?.(index)}
          labelClassName={labelClassName}
        />
      ))}
    </div>
  )
}

export function WhyVysionHardwareVideos() {
  useEffect(() => {
    const href = WHY_VYSION_HARDWARE_VIDEOS[0]?.src
    if (!href) return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'video'
    link.href = href
    document.head.appendChild(link)
    return () => {
      link.remove()
    }
  }, [])

  return <HardwareVideoStack videos={WHY_VYSION_HARDWARE_VIDEOS} priorityFirstVideo />
}
