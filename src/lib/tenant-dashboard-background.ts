import type { CSSProperties } from 'react'
import {
  parseImageZoomSettings,
  type ImageZoomSettings,
} from '@/components/ImageZoomPicker'

/** Zoom + positie uit profiel (zelfde als webshop hero). */
export function resolveAdminDashboardBackground(
  raw: string | null | undefined,
): ImageZoomSettings | null {
  const parsed = parseImageZoomSettings(raw ?? '')
  const url = parsed.url?.trim()
  if (!url) return null
  return {
    url,
    zoom: typeof parsed.zoom === 'number' && parsed.zoom > 0 ? parsed.zoom : 1,
    positionX:
      typeof parsed.positionX === 'number' && Number.isFinite(parsed.positionX)
        ? Math.min(100, Math.max(0, parsed.positionX))
        : 50,
    positionY:
      typeof parsed.positionY === 'number' && Number.isFinite(parsed.positionY)
        ? Math.min(100, Math.max(0, parsed.positionY))
        : 50,
  }
}

/** @deprecated gebruik resolveAdminDashboardBackground */
export function resolveAdminDashboardBackgroundUrl(
  raw: string | null | undefined,
): string | null {
  return resolveAdminDashboardBackground(raw)?.url ?? null
}

export function adminDashboardBackgroundImageStyle(
  settings: ImageZoomSettings,
): CSSProperties {
  const zoom = settings.zoom > 1 ? settings.zoom : 1
  return {
    objectPosition: `${settings.positionX}% ${settings.positionY}%`,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    transformOrigin: `${settings.positionX}% ${settings.positionY}%`,
  }
}
