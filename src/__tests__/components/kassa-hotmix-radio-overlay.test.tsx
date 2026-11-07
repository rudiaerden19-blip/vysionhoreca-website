import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Hotmix bij t ontbijthuisje', () => {
  it('opent hotmixradio in een apart tabblad, geen popup', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/app/shop/[tenant]/admin/kassa/page.tsx'),
      'utf8',
    )
    expect(page).not.toContain('KassaHotmixRadioOverlay')
    expect(page).not.toContain('hotmixOpen')
    expect(page).toContain('href={ONTBIJTHUISJE_HOTMIX_URL}')
    expect(page).toContain('target="_blank"')
    expect(page).toContain('isOntbijthuisjeHotmixTenant(tenant)')
  })
})
