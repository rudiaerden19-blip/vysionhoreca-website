'use client'

import { useEffect } from 'react'
import {
  HardwareVideoStack,
  type HardwareVideoConfig,
} from '@/components/HardwareVideoStack'

const WINKEL_KASSA_HUB_JPG = '/images/winkel/winkel-kassa-hub.jpg'
const WINKEL_KASSA_HUB_FULL = '/images/winkel/winkel-kassa-hub-full.png'

/**
 * Alleen `/winkel` (winkel & retail). Horeca (`/`) blijft `WhyVysionHardwareVideos`.
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
    src: WINKEL_KASSA_HUB_JPG,
    fullSrc: WINKEL_KASSA_HUB_FULL,
    altKey: 'winkelSite.videoAltKassa',
    enlargeContain: true,
  },
  {
    kind: 'image',
    src: '/images/winkel/winkel-voorraad-screenshot.jpg?v=2',
    altKey: 'winkelSite.videoAltVoorraad',
    enlargeContain: true,
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
