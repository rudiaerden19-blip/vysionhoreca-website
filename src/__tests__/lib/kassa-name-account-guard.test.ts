import type { KassaNameTabRow } from '@/lib/kassa-name-account'
import {
  assertNameTabBelongsToTenant,
  assertNameTabKnownForTenant,
  filterKassaNameTabsForTenant,
  NAME_ACCOUNT_MAX_PAYMENT_EUR,
  sanitizeNameTabPaymentAmountEur,
  validateNameTabPaymentRequest,
} from '@/lib/kassa-name-account-guard'

function tab(id: string, tenant: string): KassaNameTabRow {
  return {
    id,
    tenant_slug: tenant,
    customer_name: 'Test',
    customer_key: 'test',
    items: [],
  }
}

describe('kassa-name-account-guard', () => {
  it('filtert tabs op tenant_slug', () => {
    const rows = [tab('1', 'cafe-a'), tab('2', 'cafe-b')]
    expect(filterKassaNameTabsForTenant(rows, 'cafe-a').map((r) => r.id)).toEqual(['1'])
  })

  it('weigert tab van andere tenant', () => {
    const res = assertNameTabBelongsToTenant(tab('1', 'other'), 'cafe-a')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('tenant_scope_violation')
  })

  it('weigert tab die niet in bekende lijst staat', () => {
    const res = assertNameTabKnownForTenant(tab('9', 'cafe-a'), [tab('1', 'cafe-a')], 'cafe-a')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('tab_not_in_tenant')
  })

  it('sanitize bedrag op centen en max', () => {
    expect(sanitizeNameTabPaymentAmountEur(2.005)).toBe(2.01)
    expect(sanitizeNameTabPaymentAmountEur(NAME_ACCOUNT_MAX_PAYMENT_EUR + 1)).toBeNull()
    expect(sanitizeNameTabPaymentAmountEur(0)).toBeNull()
  })

  it('validateNameTabPaymentRequest accepteert geldige zaak+tab', () => {
    const t = tab('1', 'cafe-a')
    const res = validateNameTabPaymentRequest({
      tenantSlug: 'cafe-a',
      tab: t,
      amountEur: 3.5,
      paymentMethod: 'CASH',
      knownTabs: [t],
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.amountEur).toBe(3.5)
  })
})
