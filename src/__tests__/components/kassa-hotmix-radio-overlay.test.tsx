import { fireEvent, render, screen } from '@testing-library/react'
import { KassaHotmixRadioOverlay } from '@/components/kassa/KassaHotmixRadioOverlay'
import { ONTBIJTHUISJE_HOTMIX_URL } from '@/lib/kassa-ontbijthuisje-hotmix'

jest.mock('@/i18n', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      key === 'common.close' ? 'Sluiten' : key === 'common.refresh' ? 'Vernieuwen' : key,
  }),
}))

describe('Hotmix Radio popup', () => {
  it('legt de site over de kassa en sluit zonder de pagina te verlaten', () => {
    const onClose = jest.fn()
    const view = render(<KassaHotmixRadioOverlay open onClose={onClose} />)

    const frame = screen.getByTitle('Hotmix Radio') as HTMLIFrameElement
    expect(frame.getAttribute('src')).toBe(ONTBIJTHUISJE_HOTMIX_URL)
    expect(frame.hasAttribute('sandbox')).toBe(false)
    expect(screen.getByTestId('kassa-hotmix-refresh').textContent).toBe('Vernieuwen')
    expect(screen.getByTestId('kassa-hotmix-close').textContent).toBe('Sluiten')
    expect(screen.getByTestId('kassa-hotmix-panel').className).toContain('h-full')
    expect(screen.getByTestId('kassa-hotmix-panel').className).not.toContain('max-w-[42rem]')

    fireEvent.click(screen.getByTestId('kassa-hotmix-refresh'))
    const frameAfterRefresh = screen.getByTitle('Hotmix Radio') as HTMLIFrameElement
    expect(frameAfterRefresh.getAttribute('src')).toBe(ONTBIJTHUISJE_HOTMIX_URL)

    fireEvent.click(screen.getByTestId('kassa-hotmix-close'))
    expect(onClose).toHaveBeenCalledTimes(1)

    view.rerender(<KassaHotmixRadioOverlay open={false} onClose={onClose} />)

    expect(screen.getByTestId('kassa-hotmix-overlay').getAttribute('data-open')).toBe('false')
    expect(screen.getByTitle('Hotmix Radio')).toBeTruthy()
    expect(screen.queryByTestId('kassa-hotmix-close')).toBeNull()
  })
})
