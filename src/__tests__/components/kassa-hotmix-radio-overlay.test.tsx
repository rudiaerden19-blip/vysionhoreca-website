import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Hotmix Radio blijft van de kassa af', () => {
  it('de kassa toont geen Hotmix-popup meer', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/app/shop/[tenant]/admin/kassa/page.tsx'),
      'utf8',
    )
    expect(page).not.toContain('KassaHotmixRadioOverlay')
    expect(page).toContain('openOntbijthuisjeHotmixWindow()')
    expect(page).toContain('isOntbijthuisjeHotmixTenant(tenant)')
  })
})
