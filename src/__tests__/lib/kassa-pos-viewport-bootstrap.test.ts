import { buildKassaLayoutPreviewPosUrl, KASSA_LAYOUT_LAB_FRAMES } from '@/lib/kassa-layout-preview'
import { kitchenKdsLayoutFromProfileId } from '@/lib/kassa-viewport-chrome-tokens'
import { mergedKassaPosSearchParams, persistKassaViewportProfileContext } from '@/lib/kassa-viewport-profile-context'

describe('globaal POS viewport contract', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('lab keuken-URL heeft zelfde kvp/lab_w als kassa', () => {
    const frame = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === 'ipad-10')!
    const kassa = buildKassaLayoutPreviewPosUrl('demo', frame, 'https://x.test', 'kassa')
    const keuken = buildKassaLayoutPreviewPosUrl('demo', frame, 'https://x.test', 'keuken')
    const kQ = new URL(kassa).searchParams
    const keQ = new URL(keuken).searchParams
    expect(kQ.get('kvp')).toBe('ipad_10')
    expect(keQ.get('kvp')).toBe('ipad_10')
    expect(keQ.get('lab_w')).toBe(kQ.get('lab_w'))
    expect(keQ.get('lab_h')).toBe(kQ.get('lab_h'))
    expect(keuken).toContain('/keuken/demo')
  })

  it('merged params uit sessie na persist', () => {
    persistKassaViewportProfileContext(
      'wide15',
      new URLSearchParams('kvp=wide15&kassa_layout_preview=1&vp=wide15&lab_w=1366&lab_h=768'),
    )
    window.history.replaceState({}, '', 'http://localhost/keuken/demo')
    const sp = mergedKassaPosSearchParams()
    expect(sp.get('kvp')).toBe('wide15')
    expect(sp.get('lab_w')).toBe('1366')
  })

  it('kds per profiel uit token-tabel', () => {
    expect(kitchenKdsLayoutFromProfileId('ipad_10').columnWidthPx).toBe(285)
    expect(kitchenKdsLayoutFromProfileId('wide15').columnWidthPx).toBe(300)
    expect(kitchenKdsLayoutFromProfileId('default').columnWidthPx).toBe(400)
    expect(kitchenKdsLayoutFromProfileId('sxga').columnWidthPx).toBe(400)
    expect(kitchenKdsLayoutFromProfileId('ipad_129').columnWidthPx).toBe(300)
  })
})
