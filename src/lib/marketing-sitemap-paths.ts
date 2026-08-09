import { VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

/** Publieke marketing-URL’s op www.vysion-kassa.com (geen tenant / admin). */
export type MarketingSitemapEntry = {
  path: string
  changeFrequency: 'weekly' | 'monthly' | 'yearly'
  priority: number
}

export const MARKETING_SITEMAP_ENTRIES: MarketingSitemapEntry[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/prijzen', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/registreer', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/licentie', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/over-ons', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/resellers', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/download/print-agent-windows', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/juridisch', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/juridisch/cookies', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/dienstenovereenkomst', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/verwerkersovereenkomst', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/sla', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/aanvaardbaar-gebruik', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/betalingsplatform', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/handelsmerk', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/intellectueel-eigendom', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/juridisch/subverwerkers', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/sectoren/bakkerij', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/sectoren/cafe', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/sectoren/frituur', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/sectoren/kebab', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/sectoren/kapper', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/sectoren/retail', changeFrequency: 'monthly', priority: 0.85 },
]

export function marketingSitemapUrl(path: string): string {
  if (path === '/') return `${VYSION_CANONICAL_ORIGIN}/`
  return `${VYSION_CANONICAL_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
