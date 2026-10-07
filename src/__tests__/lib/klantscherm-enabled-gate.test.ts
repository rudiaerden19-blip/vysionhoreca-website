/** Spiegel van kassa: alleen expliciet true telt als aan (geen undefined/null). */
function isKlantschermEnabledForKassa(settings: { klantscherm_enabled?: boolean } | null): boolean {
  return settings?.klantscherm_enabled === true
}

describe('klantscherm kassa gate', () => {
  it('is off when settings missing or flag not true', () => {
    expect(isKlantschermEnabledForKassa(null)).toBe(false)
    expect(isKlantschermEnabledForKassa({})).toBe(false)
    expect(isKlantschermEnabledForKassa({ klantscherm_enabled: false })).toBe(false)
    expect(isKlantschermEnabledForKassa({ klantscherm_enabled: undefined })).toBe(false)
  })

  it('is on only for explicit true', () => {
    expect(isKlantschermEnabledForKassa({ klantscherm_enabled: true })).toBe(true)
  })
})
