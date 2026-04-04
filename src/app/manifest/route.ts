import { NextRequest, NextResponse } from 'next/server'
import { getTenantSettings } from '@/lib/admin-api'
import { normalizeThemeColorHex } from '@/lib/theme-color'
import { tenantSlugFromOrdervysionHost } from '@/lib/tenant-slug-from-host'

const DEFAULT_NAME = 'Vysion Horeca'
const DEFAULT_SHORT = 'Vysion'

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const slug = tenantSlugFromOrdervysionHost(host)

  let name = DEFAULT_NAME
  let short_name = DEFAULT_SHORT
  let theme_color = '#ffffff'
  let background_color = '#ffffff'

  if (slug) {
    try {
      const settings = await getTenantSettings(slug)
      if (settings) {
        theme_color = normalizeThemeColorHex(settings.primary_color)
        background_color = theme_color
        const bn = settings.business_name?.trim()
        if (bn) {
          name = bn
          short_name = bn.length <= 12 ? bn : bn.slice(0, 12)
        }
      }
    } catch {
      /* fallback defaults */
    }
  }

  const manifest = {
    name,
    short_name,
    description: 'Horeca kassa, reserveren, online bestellen — één platform',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color,
    theme_color,
    lang: 'nl',
    categories: ['business', 'food'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Website',
        short_name: 'Home',
        description: 'Startpagina',
        url: '/',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  })
}
