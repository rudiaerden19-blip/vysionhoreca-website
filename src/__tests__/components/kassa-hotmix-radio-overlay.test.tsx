import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Hotmix bij t ontbijthuisje', () => {
  it('linkt rechtstreeks naar hotmixradio.com, geen iframe', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/app/shop/[tenant]/admin/kassa/page.tsx'),
      'utf8',
    )
    expect(page).not.toContain('KassaHotmixRadioOverlay')
    expect(page).not.toContain('setHotmixOpen')
    expect(page).toContain('href={ONTBIJTHUISJE_HOTMIX_URL}')
    expect(page).toContain('isOntbijthuisjeHotmixTenant(tenant)')
  })
})
