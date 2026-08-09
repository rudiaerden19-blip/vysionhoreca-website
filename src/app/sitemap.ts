import type { MetadataRoute } from 'next'
import {
  MARKETING_SITEMAP_ENTRIES,
  marketingSitemapUrl,
} from '@/lib/marketing-sitemap-paths'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return MARKETING_SITEMAP_ENTRIES.map((entry) => ({
    url: marketingSitemapUrl(entry.path),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
}
