import {
  shouldOpenSectorChoiceOnThisLoad,
  shouldShowSectorChoiceGate,
} from '@/lib/sector-choice-gate-path'
import {
  branchForService,
  isLandingBranchId,
  isLandingServiceId,
  LANDING_BRANCH_COLUMNS,
  landingBranchFromPathname,
  landingSitePathForBranch,
  marketingSiteHashHref,
  readStoredLandingBranch,
  LANDING_BRANCH_STORAGE_KEY,
} from '@/lib/landing-branch-choice'
import nl from '../../../messages/nl.json'

describe('shouldShowSectorChoiceGate', () => {
  const host = 'www.vysion-kassa.com'

  it('shows on the marketing homepage and branch sites', () => {
    expect(shouldShowSectorChoiceGate('/', host)).toBe(true)
    expect(shouldShowSectorChoiceGate('/winkel', host)).toBe(true)
    expect(shouldShowSectorChoiceGate('/retail', host)).toBe(true)
  })

  it('does not show on login or register', () => {
    expect(shouldShowSectorChoiceGate('/login', host)).toBe(false)
    expect(shouldShowSectorChoiceGate('/login/forgot-password', host)).toBe(false)
    expect(shouldShowSectorChoiceGate('/registreer', host)).toBe(false)
  })

  it('does not show on tenant or admin surfaces', () => {
    expect(shouldShowSectorChoiceGate('/shop/demo', host)).toBe(false)
    expect(shouldShowSectorChoiceGate('/superadmin', host)).toBe(false)
    expect(shouldShowSectorChoiceGate('/dashboard', host)).toBe(false)
  })
})

describe('shouldOpenSectorChoiceOnThisLoad', () => {
  const origin = 'https://www.vysion-kassa.com'

  it('opens on a full page refresh', () => {
    expect(
      shouldOpenSectorChoiceOnThisLoad({
        navigationType: 'reload',
        referrer: `${origin}/`,
        pageOrigin: origin,
      }),
    ).toBe(true)
    expect(
      shouldOpenSectorChoiceOnThisLoad({
        navigationType: 1,
        referrer: `${origin}/over-ons`,
        pageOrigin: origin,
      }),
    ).toBe(true)
  })

  it('does not open when navigating between pages on the same site', () => {
    expect(
      shouldOpenSectorChoiceOnThisLoad({
        navigationType: 'navigate',
        referrer: `${origin}/`,
        pageOrigin: origin,
      }),
    ).toBe(false)
    expect(
      shouldOpenSectorChoiceOnThisLoad({
        navigationType: 'navigate',
        referrer: `${origin}/login`,
        pageOrigin: origin,
      }),
    ).toBe(false)
  })

  it('opens on first visit (no same-site referrer)', () => {
    expect(
      shouldOpenSectorChoiceOnThisLoad({
        navigationType: 'navigate',
        referrer: '',
        pageOrigin: origin,
      }),
    ).toBe(true)
    expect(
      shouldOpenSectorChoiceOnThisLoad({
        navigationType: 'navigate',
        referrer: 'https://www.google.com/',
        pageOrigin: origin,
      }),
    ).toBe(true)
  })

  it('does not reopen on back/forward', () => {
    expect(
      shouldOpenSectorChoiceOnThisLoad({
        navigationType: 'back_forward',
        referrer: `${origin}/`,
        pageOrigin: origin,
      }),
    ).toBe(false)
  })
})

describe('landing branch columns', () => {
  it('has two visitor fields plus other', () => {
    expect(LANDING_BRANCH_COLUMNS.map((c) => c.id)).toEqual(['winkel', 'horeca'])
    expect(isLandingBranchId('winkel')).toBe(true)
    expect(isLandingBranchId('retail')).toBe(true)
    expect(isLandingBranchId('other')).toBe(true)
    expect(isLandingBranchId('frituur')).toBe(false)
    expect(isLandingServiceId('frituur')).toBe(true)
    expect(isLandingServiceId('kebab')).toBe(true)
    expect(isLandingServiceId('pizza')).toBe(true)
    expect(isLandingServiceId('bakker')).toBe(true)
    expect(isLandingServiceId('groothandel')).toBe(true)
    expect(isLandingServiceId('andereRetail')).toBe(false)
    expect(isLandingServiceId('andereWinkel')).toBe(true)
    expect(isLandingServiceId('andereHoreca')).toBe(true)
    expect(branchForService('bakker')).toBe('winkel')
    expect(branchForService('kebab')).toBe('horeca')
    expect(branchForService('pizza')).toBe('horeca')
    expect(branchForService('boetiek')).toBe('winkel')
    expect(branchForService('groothandel')).toBe('winkel')
    expect(branchForService('andereWinkel')).toBe('winkel')
    expect(branchForService('frituur')).toBe('horeca')
    expect(branchForService('andereHoreca')).toBe('horeca')
    expect(branchForService('other')).toBe('other')
    expect(landingSitePathForBranch(branchForService('andereWinkel'))).toBe('/winkel')
    expect(landingSitePathForBranch(branchForService('andereHoreca'))).toBe('/')
  })

  it('routes winkel and retail to one marketing site', () => {
    expect(landingSitePathForBranch('winkel')).toBe('/winkel')
    expect(landingSitePathForBranch('retail')).toBe('/winkel')
    expect(landingSitePathForBranch('horeca')).toBe('/')
    expect(landingSitePathForBranch('other')).toBe('/')
    expect(landingBranchFromPathname('/winkel')).toBe('winkel')
    expect(landingBranchFromPathname('/retail')).toBe('winkel')
    expect(landingBranchFromPathname('/')).toBe('horeca')
    expect(landingBranchFromPathname('/over-ons')).toBe('horeca')
    expect(marketingSiteHashHref('/winkel', 'prijzen')).toBe('/winkel#prijzen')
    expect(marketingSiteHashHref('/retail', 'prijzen')).toBe('/winkel#prijzen')
    expect(marketingSiteHashHref('/', 'prijzen')).toBe('/#prijzen')
  })

  it('reads the stored landing branch from localStorage', () => {
    localStorage.removeItem(LANDING_BRANCH_STORAGE_KEY)
    expect(readStoredLandingBranch()).toBeNull()
    localStorage.setItem(
      LANDING_BRANCH_STORAGE_KEY,
      JSON.stringify({ branch: 'winkel', service: 'bakker', savedAt: 1 }),
    )
    expect(readStoredLandingBranch()).toBe('winkel')
    localStorage.setItem(LANDING_BRANCH_STORAGE_KEY, '{not-json')
    expect(readStoredLandingBranch()).toBeNull()
    localStorage.removeItem(LANDING_BRANCH_STORAGE_KEY)
  })

  it('has Dutch copy for the two columns and the other link', () => {
    const modal = (nl as { sectorModal: { title: string; other: string; columns: Record<string, { title: string; items: Record<string, string> }> } }).sectorModal
    expect(modal.title).toBe('Kies jouw branche')
    expect(modal.other).toBe('Andere')
    expect(modal.columns.winkel.title).toBe('WINKEL & RETAIL')
    expect(modal.columns.winkel.items.bakker).toBe('Bakker')
    expect(modal.columns.winkel.items.groothandel).toBe('Groothandel')
    expect(modal.columns.winkel.items.andereWinkel).toBe('Andere')
    expect(modal.columns.horeca.items.andereHoreca).toBe('Andere')
    const sites = (nl as { heroLanding: { sites: Record<string, { title: string }> } }).heroLanding.sites
    expect(sites.winkel.title).toBe('Kassa & platform voor je winkel')
    const winkelSite = (nl as { winkelSite: { title: string } }).winkelSite
    expect(winkelSite.title).toBe('De complete kassa voor jouw winkel')
    for (const column of LANDING_BRANCH_COLUMNS) {
      expect(modal.columns[column.id]?.title).toBeTruthy()
      for (const itemKey of column.itemKeys) {
        expect(modal.columns[column.id].items[itemKey]).toBeTruthy()
      }
    }
  })
})
