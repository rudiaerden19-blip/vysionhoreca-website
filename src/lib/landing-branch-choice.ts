export const LANDING_BRANCH_STORAGE_KEY = 'vysion_landing_sector_v3'

export const LANDING_BRANCH_IDS = ['winkel', 'retail', 'horeca'] as const

export type LandingBranchId = (typeof LANDING_BRANCH_IDS)[number] | 'other'

export const LANDING_BRANCH_COLUMNS: Array<{
  id: Exclude<LandingBranchId, 'other'>
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
      'buurtwinkel',
      'speciaalzaak',
    ],
  },
  {
    id: 'retail',
    itemKeys: ['boetiek', 'elektronica', 'geschenkzaak', 'dierenwinkel', 'groothandel', 'andereRetail'],
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
