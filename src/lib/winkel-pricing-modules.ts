/** Shop-only modules on /winkel pricing and winkel /prijzen cards (not horeca). */
export const WINKEL_PRICING_MODULE_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const

export function winkelPricingModuleKey(id: number): string {
  return `winkelSite.pricingModules.${id}`
}

export function isWinkelMarketingBranch(branch: string | null | undefined): boolean {
  return branch === 'winkel' || branch === 'retail'
}
