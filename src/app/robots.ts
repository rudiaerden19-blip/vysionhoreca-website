import type { MetadataRoute } from 'next'
import { VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/login',
        '/dashboard/',
        '/superadmin/',
        '/keuken/',
        '/verify-email',
        '/shop/',
        '/admin/',
      ],
    },
    sitemap: `${VYSION_CANONICAL_ORIGIN}/sitemap.xml`,
    host: VYSION_CANONICAL_ORIGIN,
  }
}
