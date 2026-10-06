import { pickSoundZoneIdByDisplayName } from '@/lib/soundtrack/soundtrack-server'

describe('pickSoundZoneIdByDisplayName', () => {
  const zones = [
    { id: 'offline-1', name: 'Demo Zaak', online: false, isPaired: false },
    { id: 'live-1', name: 'Demo Zaak', online: true, isPaired: true },
    { id: 'other', name: 'Other', online: true, isPaired: true },
  ]

  it('prefers online paired zone when names duplicate', () => {
    expect(pickSoundZoneIdByDisplayName(zones, 'Demo Zaak')).toBe('live-1')
  })

  it('matches case-insensitively', () => {
    expect(pickSoundZoneIdByDisplayName(zones, 'demo zaak')).toBe('live-1')
  })

  it('falls back to first name match when none are paired', () => {
    const offlineOnly = [
      { id: 'a', name: 'X', online: false, isPaired: false },
      { id: 'b', name: 'X', online: true, isPaired: false },
    ]
    expect(pickSoundZoneIdByDisplayName(offlineOnly, 'X')).toBe('a')
  })
})
