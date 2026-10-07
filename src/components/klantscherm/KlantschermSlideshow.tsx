'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  }, [slideSequenceKey])

  const current = photoSlides[index] ?? photoSlides[0]

  useEffect(() => {
    if (photoSlides.length <= 1) return
    const id = window.setInterval(advance, IMAGE_MS)
    return () => window.clearInterval(id)
  }, [slideSequenceKey, advance, photoSlides.length])

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
