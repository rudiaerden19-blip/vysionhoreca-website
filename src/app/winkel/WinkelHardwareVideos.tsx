'use client'

import { useEffect } from 'react'
import {
  HardwareVideoStack,
  type HardwareVideoConfig,
} from '@/components/HardwareVideoStack'

/**
 * Alleen `/winkel`. Horeca (`/`) en retail blijven `WhyVysionHardwareVideos`.
 * Reservaties-tablet → winkelskassa; horeca-productkassa → voorraad.
 */
const WINKEL_WHY_VYSION_VIDEOS: HardwareVideoConfig[] = [
  {
    src: '/images/vysion-hardware-showcase-inline.mp4',
    fullSrc: '/images/vysion-hardware-showcase.mp4',
    poster: '/images/vysion-hardware-showcase-poster.jpg',
    altKey: 'whyVysion.videoAltShowcase',
  },
  {
    kind: 'image',
    src: '/images/winkel/winkel-kassa-screenshot.jpg',
    altKey: 'winkelSite.videoAltKassa',
  },
  {
    kind: 'image',
    src: '/images/winkel/winkel-voorraad-screenshot.jpg',
    altKey: 'winkelSite.videoAltVoorraad',
  },
]

export default function WinkelHardwareVideos() {
  useEffect(() => {
    const href = WINKEL_WHY_VYSION_VIDEOS[0]?.src
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

  return <HardwareVideoStack videos={WINKEL_WHY_VYSION_VIDEOS} priorityFirstVideo />
}
