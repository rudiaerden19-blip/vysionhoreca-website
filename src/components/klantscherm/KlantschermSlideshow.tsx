'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KlantschermPromoSlide } from '@/lib/klantscherm-custom-promos'
import { KlantschermPromoSlideFrame } from '@/components/klantscherm/KlantschermPromoSlideFrame'

const IMAGE_MS = 5000

export function KlantschermSlideshow({ slides }: { slides: KlantschermPromoSlide[] }) {
  const photoSlides = useMemo(() => {
    const filtered = slides.filter((s) => s.type === 'image' && s.url.trim())
    return [...filtered].sort(
      (a, b) => a.sort - b.sort || a.url.localeCompare(b.url),
    )
  }, [slides])
  /** Stabiele key — niet op elke poll opnieuw naar slide 0 springen. */
  const slideSequenceKey = useMemo(
    () => photoSlides.map((s) => `${s.sort}:${s.url}`).join('|'),
    [photoSlides],
  )
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const photoSlidesRef = useRef(photoSlides)
  photoSlidesRef.current = photoSlides

  useEffect(() => {
    setIndex(0)
    setVisible(true)
  }, [slideSequenceKey])

  const current = photoSlides[index] ?? photoSlides[0]

  useEffect(() => {
    const n = photoSlides.length
    if (n <= 1) return

    let cancelled = false
    let timeoutId = 0

    const advance = () => {
      const list = photoSlidesRef.current
      if (list.length <= 1) return
      setVisible(false)
      timeoutId = window.setTimeout(() => {
        if (cancelled) return
        setIndex((i) => (i + 1) % list.length)
        setVisible(true)
      }, 450)
    }

    const intervalId = window.setInterval(advance, IMAGE_MS)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [slideSequenceKey, photoSlides.length])

  if (photoSlides.length === 0 || !current) return null

  return (
    <KlantschermPromoSlideFrame
      url={current.url}
      visible={visible}
      copy={{
        title: current.title,
        description: current.description,
        displayPrice: current.displayPrice,
        promoText: current.promoText,
      }}
    />
  )
}
