import {
  ONTBIJTHUISJE_HOTMIX_URL,
  ONTBIJTHUISJE_HOTMIX_WINDOW,
  isOntbijthuisjeHotmixTenant,
  openOntbijthuisjeHotmixWindow,
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

  it('opent een gewoon venster zonder popup-afmetingen', () => {
    const focus = jest.fn()
    const openImpl = jest.fn(() => ({ focus }) as unknown as Window)
    const opened = openOntbijthuisjeHotmixWindow(openImpl)
    expect(openImpl).toHaveBeenCalledWith(ONTBIJTHUISJE_HOTMIX_URL, ONTBIJTHUISJE_HOTMIX_WINDOW)
    expect(openImpl.mock.calls[0]).toHaveLength(2)
    expect(focus).toHaveBeenCalledTimes(1)
    expect(opened).not.toBeNull()
  })
})
