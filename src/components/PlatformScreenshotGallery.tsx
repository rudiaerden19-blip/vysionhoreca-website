'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'

export type GalleryImage = {
  src: string
  alt: string
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {dir === 'left' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      )}
    </svg>
  )
}

export default function PlatformScreenshotGallery({ images }: { images: GalleryImage[] }) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const n = images.length

  const prev = useCallback(() => {
    setIndex((i) => (i === 0 ? n - 1 : i - 1))
  }, [n])

  const next = useCallback(() => {
    setIndex((i) => (i === n - 1 ? 0 : i + 1))
  }, [n])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, prev, next])

  if (n === 0) return null

  const current = images[index]

  return (
    <>
      <div className="relative mx-auto mt-10 max-w-4xl">
        <p className="mb-3 text-center text-sm font-medium text-gray-500">{t('platform.galleryHint')}</p>

        <div className="relative flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={prev}
            className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow-sm hover:border-accent hover:text-accent transition-colors"
            aria-label={t('platform.galleryPrev')}
          >
            <Chevron dir="left" />
          </button>

          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="relative min-h-[200px] flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-md cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t('platform.galleryOpen')}
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={current.src}
                alt={current.alt}
                fill
                className="object-contain"
                sizes="(max-width: 896px) 85vw, 820px"
                priority={index === 0}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={next}
            className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow-sm hover:border-accent hover:text-accent transition-colors"
            aria-label={t('platform.galleryNext')}
          >
            <Chevron dir="right" />
          </button>
        </div>

        <p className="mt-3 text-center text-sm text-gray-500">
          {index + 1} / {n}
        </p>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/92 p-4 sm:p-8"
          role="presentation"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-2 sm:left-6 top-1/2 z-[121] -translate-y-1/2 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label={t('platform.galleryPrev')}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-2 sm:right-6 top-1/2 z-[121] -translate-y-1/2 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label={t('platform.galleryNext')}
          >
            <Chevron dir="right" />
          </button>

          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-2 top-2 z-[121] rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
            aria-label={t('platform.galleryClose')}
          >
            ×
          </button>

          <div
            className="relative max-h-[90vh] max-w-[min(100%,1100px)] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={current.src}
                alt={current.alt}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
