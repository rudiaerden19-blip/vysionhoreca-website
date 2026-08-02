import {
  buildDefaultDeliverySettingsRow,
  buildDefaultReservationSettingsRow,
} from '@/lib/tenant-defaults'

describe('tenant-defaults', () => {
  it('buildDefaultDeliverySettingsRow sets tenant_slug and sane shop defaults', () => {
    const row = buildDefaultDeliverySettingsRow('demo-cafe')
    expect(row.tenant_slug).toBe('demo-cafe')
    expect(row.pickup_enabled).toBe(true)
    expect(row.delivery_enabled).toBe(true)
    expect(row.payment_cash).toBe(true)
    expect(row.min_order_amount).toBe(15)
  })

  it('buildDefaultReservationSettingsRow has tenant_slug and empty floor plan implied separately', () => {
    const row = buildDefaultReservationSettingsRow('new-zaak')
    expect(row.tenant_slug).toBe('new-zaak')
    expect(row.is_enabled).toBe(true)
    expect(row.floor_plan_tables_locked).toBe(true)
    expect(Array.isArray(row.shifts)).toBe(true)
  })
})
