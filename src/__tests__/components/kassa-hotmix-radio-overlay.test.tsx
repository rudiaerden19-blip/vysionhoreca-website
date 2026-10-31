import { fireEvent, render, screen } from '@testing-library/react'
import { KassaHotmixRadioOverlay } from '@/components/kassa/KassaHotmixRadioOverlay'
import { ONTBIJTHUISJE_HOTMIX_URL } from '@/lib/kassa-ontbijthuisje-hotmix'

jest.mock('@/i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'common.close' ? 'Sluiten' : key),
  }),
}))

describe('Hotmix Radio popup', () => {
  it('legt de site over de kassa en sluit zonder de pagina te verlaten', () => {
    const onClose = jest.fn()
    const view = render(<KassaHotmixRadioOverlay open onClose={onClose} />)

    const frame = screen.getByTitle('Hotmix Radio') as HTMLIFrameElement
    expect(frame.getAttribute('src')).toBe(ONTBIJTHUISJE_HOTMIX_URL)
    expect(frame.getAttribute('sandbox') ?? '').not.toContain('allow-top-navigation')
    expect(screen.getByTestId('kassa-hotmix-close').textContent).toBe('Sluiten')

    fireEvent.click(screen.getByTestId('kassa-hotmix-close'))
    expect(onClose).toHaveBeenCalledTimes(1)

    view.rerender(<KassaHotmixRadioOverlay open={false} onClose={onClose} />)

    expect(screen.getByTestId('kassa-hotmix-overlay').getAttribute('data-open')).toBe('false')
    expect(screen.getByTitle('Hotmix Radio')).toBeTruthy()
    expect(screen.queryByTestId('kassa-hotmix-close')).toBeNull()
  })
})
