import {
  kassaChromeDensityFromProfileId,
  kassaCompactChromeFromProfileId,
  isKassaTabletViewportProfile,
} from '@/lib/kassa-chrome-from-profile'

describe('kassa-chrome-from-profile', () => {
  it('density volgt profiel-id (lab kvp = zaak)', () => {
    expect(kassaChromeDensityFromProfileId('wide15')).toBe('wide15')
    expect(kassaChromeDensityFromProfileId('sxga')).toBe('sxga')
    expect(kassaChromeDensityFromProfileId('ipad_10')).toBe('default')
    expect(kassaChromeDensityFromProfileId('default')).toBe('default')
  })

  it('compact chrome alleen 15 en 17', () => {
    expect(kassaCompactChromeFromProfileId('wide15')).toBe(true)
    expect(kassaCompactChromeFromProfileId('sxga')).toBe(true)
    expect(kassaCompactChromeFromProfileId('ipad_10')).toBe(false)
  })

  it('tablet-profielen', () => {
    expect(isKassaTabletViewportProfile('ipad_10')).toBe(true)
    expect(isKassaTabletViewportProfile('ipad_129')).toBe(true)
    expect(isKassaTabletViewportProfile('wide15')).toBe(false)
  })
})
