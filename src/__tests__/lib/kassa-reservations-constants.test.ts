import {
  KASSA_DEFAULT_RESERVATION_SETTINGS,
  mapReservationSettingsFromDb,
} from '@/components/kassa-reservations/kassa-reservations-constants'

describe('kassa-reservations-constants', () => {
  it('mapReservationSettingsFromDb with empty row returns defaults-aligned flags', () => {
    const partial = mapReservationSettingsFromDb({})
    expect(partial.maxPartySize).toBe(KASSA_DEFAULT_RESERVATION_SETTINGS.maxPartySize)
    expect(partial.isEnabled).toBe(KASSA_DEFAULT_RESERVATION_SETTINGS.isEnabled)
    expect(partial.closedDays).toEqual(KASSA_DEFAULT_RESERVATION_SETTINGS.closedDays)
  })

  it('parses numeric strings from Supabase-style payloads', () => {
    const partial = mapReservationSettingsFromDb({
      max_party_size: '8',
      buffer_minutes: '20',
      is_enabled: true,
    })
    expect(partial.maxPartySize).toBe(8)
    expect(partial.bufferMinutes).toBe(20)
    expect(partial.isEnabled).toBe(true)
  })
})
