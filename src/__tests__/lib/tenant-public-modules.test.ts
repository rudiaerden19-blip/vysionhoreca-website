import {
  resolvePublicOnlineOrderingEnabled,
  resolvePublicReservationsEnabled,
} from '@/lib/tenant-public-online-ordering'

const slug = 'voorbeeld-zaak'

describe('publieke module-gates', () => {
  it('reserveringen uit als module reservaties uit staat', () => {
    expect(
      resolvePublicReservationsEnabled(slug, {
        tenant: {
          plan: 'pro',
          enabled_modules: { reservaties: false, kassa: true, 'online-bestellingen': true },
        },
      }),
    ).toBe(false)
  })

  it('reserveringen aan als module reservaties aan staat', () => {
    expect(
      resolvePublicReservationsEnabled(slug, {
        tenant: {
          plan: 'pro',
          enabled_modules: { reservaties: true, kassa: true },
        },
      }),
    ).toBe(true)
  })

  it('reserveringen uit zonder tenant-payload', () => {
    expect(resolvePublicReservationsEnabled(slug, null)).toBe(false)
    expect(resolvePublicReservationsEnabled(slug, {})).toBe(false)
  })

  it('online bestellen blijft los van reservaties', () => {
    const payload = {
      tenant: {
        plan: 'pro',
        enabled_modules: { reservaties: false, 'online-bestellingen': true, kassa: true },
      },
    }
    expect(resolvePublicReservationsEnabled(slug, payload)).toBe(false)
    expect(resolvePublicOnlineOrderingEnabled(slug, payload)).toBe(true)
  })
})
