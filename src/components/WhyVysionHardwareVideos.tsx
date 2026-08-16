'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/i18n'

export const WHY_VYSION_HARDWARE_VIDEOS = [
  {
    src: '/images/sunmi-d3-pro-display.mp4',
    altKey: 'whyVysion.videoAltSunmi',
  },
  {
    src: '/images/epson-mseries-receipt-printers.mp4',
    altKey: 'whyVysion.videoAltEpson',
  },
] as const

type VideoItem = (typeof WHY_VYSION_HARDWARE_VIDEOS)[number]

function HardwareVideoTile({ item }: { item: VideoItem }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inlineRef = useRef<HTMLVideoElement>(null)
  const modalRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    if (inline) modal.currentTime = inline.currentTime
    modal.muted = false
    void modal.play().catch(() => {})
  }, [expanded])

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

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group relative w-full aspect-video overflow-hidden rounded-3xl shadow-home-photo ring-1 ring-black/[0.08] bg-[#141414] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={`${label}. ${t('whyVysion.videoTapToEnlarge')}`}
      >
        <video
          ref={inlineRef}
          src={item.src}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
          aria-hidden
        />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-center text-xs font-semibold text-white/95 sm:text-sm">
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
                  src={item.src}
                  loop
                  playsInline
                  controls
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

export function WhyVysionHardwareVideos() {
  return (
    <div className="flex w-full max-w-[854px] flex-col gap-6 sm:gap-8 mx-auto lg:mx-0">
      {WHY_VYSION_HARDWARE_VIDEOS.map((item) => (
        <HardwareVideoTile key={item.src} item={item} />
      ))}
    </div>
  )
}
