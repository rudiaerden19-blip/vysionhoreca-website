import { parseImageZoomSettings } from '@/components/ImageZoomPicker'

/** URL voor admin-overzicht achtergrond (ImageZoom JSON of platte URL). */
export function resolveAdminDashboardBackgroundUrl(
  raw: string | null | undefined,
): string | null {
  const url = parseImageZoomSettings(raw ?? '').url?.trim()
  return url || null
}
