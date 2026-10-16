import type { TenantSettings } from '@/lib/admin-api'
import {
  isKassaJetonQuickSuccessFlowTenant,
  KASSA_JETON_QUICK_SUCCESS_MODAL_MS,
} from '@/lib/kassa-jeton-quick-success-flow'

describe('kassa-jeton-quick-success-flow', () => {
  it('Lagoon slug is always quick flow', () => {
    expect(isKassaJetonQuickSuccessFlowTenant('thelagoon', null)).toBe(true)
    expect(
      isKassaJetonQuickSuccessFlowTenant('TheLagoon', {
        kassa_jeton_quick_success_flow: false,
      } as TenantSettings),
    ).toBe(true)
  })

  it('other tenants only with flag', () => {
    expect(isKassaJetonQuickSuccessFlowTenant('demo-frituur', null)).toBe(false)
    expect(
      isKassaJetonQuickSuccessFlowTenant('demo-frituur', {
        kassa_jeton_quick_success_flow: true,
      } as TenantSettings),
    ).toBe(true)
  })

  it('modal duration is 1 second', () => {
    expect(KASSA_JETON_QUICK_SUCCESS_MODAL_MS).toBe(1000)
  })
})
