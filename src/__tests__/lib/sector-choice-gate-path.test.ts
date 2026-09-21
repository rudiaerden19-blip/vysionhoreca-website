import { shouldShowSectorChoiceGate } from '@/lib/sector-choice-gate-path'
import {
  branchForService,
  isLandingBranchId,
  isLandingServiceId,
  LANDING_BRANCH_COLUMNS,
} from '@/lib/landing-branch-choice'
import nl from '../../../messages/nl.json'

describe('shouldShowSectorChoiceGate', () => {
  const host = 'www.vysion-kassa.com'

  it('shows on the marketing homepage', () => {
    expect(shouldShowSectorChoiceGate('/', host)).toBe(true)
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

describe('landing branch columns', () => {
  it('has three visitor fields plus other', () => {
    expect(LANDING_BRANCH_COLUMNS.map((c) => c.id)).toEqual(['winkel', 'retail', 'horeca'])
    expect(isLandingBranchId('winkel')).toBe(true)
    expect(isLandingBranchId('other')).toBe(true)
    expect(isLandingBranchId('frituur')).toBe(false)
    expect(isLandingServiceId('frituur')).toBe(true)
    expect(isLandingServiceId('kebab')).toBe(true)
    expect(isLandingServiceId('pizza')).toBe(true)
    expect(isLandingServiceId('bakker')).toBe(true)
    expect(branchForService('bakker')).toBe('winkel')
    expect(branchForService('kebab')).toBe('horeca')
    expect(branchForService('pizza')).toBe('horeca')
    expect(branchForService('boetiek')).toBe('retail')
    expect(branchForService('frituur')).toBe('horeca')
    expect(branchForService('other')).toBe('other')
  })

  it('has Dutch copy for the three columns and the other link', () => {
    const modal = (nl as { sectorModal: { title: string; other: string; columns: Record<string, { title: string; items: Record<string, string> }> } }).sectorModal
    expect(modal.title).toBe('Welke branche past bij uw zaak?')
    expect(modal.other).toBe('Andere branche / algemeen bekijken.')
    for (const column of LANDING_BRANCH_COLUMNS) {
      expect(modal.columns[column.id]?.title).toBeTruthy()
      for (const itemKey of column.itemKeys) {
        expect(modal.columns[column.id].items[itemKey]).toBeTruthy()
      }
    }
  })
})
