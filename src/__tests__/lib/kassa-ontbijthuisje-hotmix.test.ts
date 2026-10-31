import {
  ONTBIJTHUISJE_HOTMIX_URL,
  isOntbijthuisjeHotmixTenant,
} from '@/lib/kassa-ontbijthuisje-hotmix'

describe('ontbijthuisje hotmix', () => {
  it('alleen t ontbijthuisje', () => {
    expect(isOntbijthuisjeHotmixTenant('tontbijthuisje')).toBe(true)
    expect(isOntbijthuisjeHotmixTenant('t-ontbijthuisje')).toBe(true)
    expect(isOntbijthuisjeHotmixTenant('ohgreen')).toBe(false)
    expect(isOntbijthuisjeHotmixTenant('thelagoon')).toBe(false)
    expect(isOntbijthuisjeHotmixTenant('ontbijthuisje')).toBe(false)
  })

  it('opent de hotmix-site', () => {
    expect(ONTBIJTHUISJE_HOTMIX_URL).toBe('https://www.hotmixradio.com')
  })
})
