'use client'

import { useEffect, useState } from 'react'

const FADE_MS = 5000

export function KlantschermSlideshow({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (images.length <= 1) return
    const id = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % images.length)
        setVisible(true)
      }, 450)
    }, FADE_MS)
    return () => window.clearInterval(id)
  }, [images.length])

  if (images.length === 0) return null

  const src = images[index] ?? images[0]

  return (
    <div className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt=""
        className={`max-h-[100dvh] max-w-full object-contain transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
