import { fireEvent, render, screen } from '@testing-library/react'
import { KassaHotmixRadioOverlay } from '@/components/kassa/KassaHotmixRadioOverlay'
import { ONTBIJTHUISJE_HOTMIX_URL } from '@/lib/kassa-ontbijthuisje-hotmix'

jest.mock('@/i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.refresh': 'Vernieuwen',
        'kassaApp.hotmixMinimize': 'Minimaliseren',
        'kassaApp.hotmixRestore': 'Hotmix openen',
        'kassaApp.hotmixRefreshHint': 'hint',
        'kassaApp.hotmixMinimizeHint': 'hint',
      }
      return map[key] ?? key
    },
  }),
}))

describe('Hotmix Radio overlay', () => {
  it('staat over de kassa, minimaliseren toont herstelknop', () => {
    const onMinimize = jest.fn()
    const onExpand = jest.fn()
    const view = render(
      <KassaHotmixRadioOverlay expanded onRequestExpand={onExpand} onMinimize={onMinimize} />,
    )

    const frame = screen.getByTitle('Hotmix Radio') as HTMLIFrameElement
    expect(frame.getAttribute('src')).toBe(ONTBIJTHUISJE_HOTMIX_URL)
    expect(frame.hasAttribute('sandbox')).toBe(false)
    expect(screen.getByTestId('kassa-hotmix-minimize').textContent).toBe('Minimaliseren')

    fireEvent.click(screen.getByTestId('kassa-hotmix-minimize'))
    expect(onMinimize).toHaveBeenCalledTimes(1)

    view.rerender(
      <KassaHotmixRadioOverlay expanded={false} onRequestExpand={onExpand} onMinimize={onMinimize} />,
    )

    expect(screen.getByTestId('kassa-hotmix-overlay').getAttribute('data-open')).toBe('false')
    expect(screen.getByTestId('kassa-hotmix-restore').textContent).toBe('Hotmix openen')
    fireEvent.click(screen.getByTestId('kassa-hotmix-restore'))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })
})
