import { kassaShowsDrawerInsteadOfBtwBon } from '@/lib/kassa-footer-drawer'

describe('kassa-footer-drawer', () => {
  it('houdt BTW-bon als standaard (alle tenants)', () => {
    expect(kassaShowsDrawerInsteadOfBtwBon(null)).toBe(false)
    expect(kassaShowsDrawerInsteadOfBtwBon(undefined)).toBe(false)
    expect(kassaShowsDrawerInsteadOfBtwBon({})).toBe(false)
    expect(kassaShowsDrawerInsteadOfBtwBon({ kassa_footer_drawer_button: false })).toBe(false)
    expect(kassaShowsDrawerInsteadOfBtwBon({ kassa_footer_drawer_button: null })).toBe(false)
  })

  it('toont Lade open alleen als de tenant-instelling aan staat', () => {
    expect(kassaShowsDrawerInsteadOfBtwBon({ kassa_footer_drawer_button: true })).toBe(true)
  })
})
