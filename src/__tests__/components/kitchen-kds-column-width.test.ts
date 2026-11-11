import { kdsColumnWidthPx } from '@/components/keuken/KitchenKdsColumn'
import { kitchenKdsLayoutFromProfileId } from '@/lib/kassa-viewport-chrome-tokens'

describe('kds kolombreedte via profiel-tokens', () => {
  it('legacy density helpers sync met tokens', () => {
    expect(kdsColumnWidthPx('default')).toBe(kitchenKdsLayoutFromProfileId('default').columnWidthPx)
    expect(kdsColumnWidthPx('wide15')).toBe(kitchenKdsLayoutFromProfileId('wide15').columnWidthPx)
    expect(kdsColumnWidthPx('ipad10')).toBe(kitchenKdsLayoutFromProfileId('ipad_10').columnWidthPx)
  })
})
