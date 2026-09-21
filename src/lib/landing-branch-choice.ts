export const LANDING_BRANCH_STORAGE_KEY = 'vysion_landing_sector_v3'

/** Oud opgeslagen `retail` blijft geldig; de marketing-site is /winkel. */
export const LANDING_BRANCH_IDS = ['winkel', 'retail', 'horeca'] as const

export type LandingBranchId = (typeof LANDING_BRANCH_IDS)[number] | 'other'

export const LANDING_BRANCH_COLUMNS: Array<{
  id: 'winkel' | 'horeca'
  itemKeys: readonly string[]
}> = [
  {
    id: 'winkel',
    itemKeys: [
      'bakker',
      'slager',
      'kapper',
      'nachtwinkel',
      'kledingzaak',
      'schoenenwinkel',
      'boetiek',
      'elektronica',
      'geschenkzaak',
      'dierenwinkel',
      'buurtwinkel',
      'speciaalzaak',
      'groothandel',
      'andereWinkel',
    ],
  },
  {
    id: 'horeca',
    itemKeys: [
      'frituur',
      'restaurant',
      'cafe',
      'brasserie',
      'hotel',
      'snackbar',
      'broodjeszaak',
      'takeaway',
      'kebab',
      'pizza',
      'andereHoreca',
    ],
  },
]

const SERVICE_IDS = new Set<string>([
  'other',
  ...LANDING_BRANCH_COLUMNS.flatMap((column) => column.itemKeys),
])

export type LandingServiceId = string

export type LandingBranchChoice = {
  branch: LandingBranchId
  service: LandingServiceId
  savedAt: number
}

export function isLandingBranchId(value: string): value is LandingBranchId {
  return value === 'other' || (LANDING_BRANCH_IDS as readonly string[]).includes(value)
}

export function isLandingServiceId(value: string): boolean {
  return SERVICE_IDS.has(value)
}

export function branchForService(service: LandingServiceId): LandingBranchId {
  if (service === 'other') return 'other'
  const column = LANDING_BRANCH_COLUMNS.find((c) => c.itemKeys.includes(service))
  return column?.id ?? 'other'
}

/** Twee marketing-sites: winkel & retail = /winkel, horeca = homepage. */
export const LANDING_SITE_PATHS = {
  winkel: '/winkel',
  retail: '/winkel',
  horeca: '/',
  other: '/',
} as const

export function landingSitePathForBranch(branch: LandingBranchId): string {
  return LANDING_SITE_PATHS[branch]
}

export function readStoredLandingBranch(): LandingBranchId | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LANDING_BRANCH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { branch?: unknown }
    if (typeof parsed.branch === 'string' && isLandingBranchId(parsed.branch)) {
      return parsed.branch
    }
  } catch {
    /* ignore */
  }
  return null
}

export function landingBranchFromPathname(
  pathname: string | null,
): Exclude<LandingBranchId, 'other'> {
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/'
  if (path === '/winkel' || path.startsWith('/winkel/')) return 'winkel'
  if (path === '/retail' || path.startsWith('/retail/')) return 'winkel'
  if (path === '/sectoren/kledingwinkel' || path.startsWith('/sectoren/kledingwinkel/')) {
    return 'winkel'
  }
  const winkelSectors = ['bakkerij', 'kapper', 'slagerij', 'nachtwinkel']
  const sectorSlug = path.startsWith('/sectoren/') ? path.slice('/sectoren/'.length).split('/')[0] : ''
  if (winkelSectors.includes(sectorSlug)) return 'winkel'
  return 'horeca'
}

export function marketingSiteHashHref(pathname: string | null, hashId: string): string {
  const base = landingSitePathForBranch(landingBranchFromPathname(pathname))
  const id = hashId.replace(/^#/, '')
  return base === '/' ? `/#${id}` : `${base}#${id}`
}
