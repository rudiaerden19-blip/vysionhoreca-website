'use client'

import { scheduleHardwareInlineLoad } from '@/lib/hardware-video-load-queue'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/i18n'

export type HardwareVideoConfig = {
  /** Standaard video; `image` = statische foto met dezelfde tegel + lightbox. */
  kind?: 'video' | 'image'
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
  {
    kind: 'image',
    src: '/images/hardware/connected-hub-kassa-screenshot.png',
    fullSrc: '/images/hardware/connected-hub-kassa-screenshot-full.png',
    altKey: 'whyVysion.videoAltKassaUi',
  },
]

function useHardwareEnlargeLock(expanded: boolean, onClose: () => void) {
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded, onClose])
}

function HardwareEnlargeModal({
  open,
  onClose,
  label,
  closeLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  closeLabel: string
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useHardwareEnlargeLock(open, onClose)

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[10001] flex min-h-[3rem] items-center justify-center gap-2 rounded-full border-2 border-white/60 bg-white px-5 py-3 text-base font-bold text-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-5 sm:px-6"
      >
        <span className="text-xl leading-none" aria-hidden>
          ×
        </span>
        <span>{closeLabel}</span>
      </button>
      <div className="absolute inset-0 size-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** Volledig scherm — op smalle telefoons vult brede screenshots het scherm (cover). */
const ENLARGE_IMAGE_CLASS =
  'size-full max-h-[100dvh] max-w-[100vw] object-cover object-center md:object-contain'
const ENLARGE_VIDEO_CLASS = 'size-full max-h-[100dvh] max-w-[100vw] object-contain bg-black'

function HardwareImageTile({
  item,
  tileClassName,
  labelClassName,
}: {
  item: HardwareVideoConfig
  tileClassName?: string
  labelClassName?: string
}) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const fullSrc = item.fullSrc ?? item.src
  const label = t(item.altKey)

  const close = useCallback(() => setExpanded(false), [])

  const tileClass =
    tileClassName ??
    'group relative w-full aspect-video overflow-hidden rounded-3xl shadow-home-photo ring-1 ring-black/[0.08] bg-[#141414] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={tileClass}
        aria-label={`${label}. ${t('whyVysion.videoTapToEnlarge')}`}
      >
        <img
          src={item.src}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
          decoding="async"
          fetchPriority="low"
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

      <HardwareEnlargeModal
        open={expanded}
        onClose={close}
        label={label}
        closeLabel={t('ui.ariaClose')}
      >
        <img
          src={fullSrc}
          alt={label}
          width={2532}
          height={969}
          className={ENLARGE_IMAGE_CLASS}
          decoding="sync"
          fetchPriority="high"
        />
      </HardwareEnlargeModal>
    </>
  )
}

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
    let cancelled = false

    const playFromStart = () => {
      const modal = modalRef.current
      if (!modal || cancelled) return
      modal.currentTime = 0
      modal.muted = false
      void modal.play().catch(() => {})
    }

    const id = requestAnimationFrame(() => {
      const modal = modalRef.current
      if (!modal) return
      if (modal.readyState >= HTMLMediaElement.HAVE_METADATA) {
        playFromStart()
      } else {
        modal.addEventListener('loadedmetadata', playFromStart, { once: true })
      }
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [expanded, fullSrc])

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

      <HardwareEnlargeModal
        open={expanded}
        onClose={close}
        label={label}
        closeLabel={t('ui.ariaClose')}
      >
        <video
          ref={modalRef}
          src={fullSrc}
          loop
          playsInline
          controls
          preload="auto"
          className={ENLARGE_VIDEO_CLASS}
        />
      </HardwareEnlargeModal>
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
      {videos.map((item, index) =>
        item.kind === 'image' ? (
          <HardwareImageTile
            key={`image-${item.src}`}
            item={item}
            tileClassName={getTileClassName?.(index)}
            labelClassName={labelClassName}
          />
        ) : (
          <HardwareVideoTile
            key={item.src}
            item={item}
            loadImmediately={priorityFirstVideo && index === 0}
            tileClassName={getTileClassName?.(index)}
            labelClassName={labelClassName}
          />
        ),
      )}
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
