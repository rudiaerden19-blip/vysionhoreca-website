import { NextResponse } from 'next/server'
import { loadKassaViewportProfileSettingsMap } from '@/lib/kassa-viewport-profile-settings-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Platform chrome voor alle tenants — read-only, geen secrets. */
export async function GET() {
  try {
    const { map, version } = await loadKassaViewportProfileSettingsMap()
    return NextResponse.json(
      { version, map },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      },
    )
  } catch {
    return NextResponse.json(
      { version: '0', map: {} },
      {
        headers: {
          'Cache-Control': 'private, max-age=5',
        },
      },
    )
  }
}
