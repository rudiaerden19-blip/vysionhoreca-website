import {
  KDS_COLUMN_WIDTH_IPAD10_PX,
  KDS_COLUMN_WIDTH_PX,
  KDS_COLUMN_WIDTH_WIDE15_PX,
  kdsColumnWidthPx,
  kitchenKdsDensityFromViewportProfileId,
} from '@/components/keuken/KitchenKdsColumn'

describe('kdsColumnWidthPx', () => {
  it('houdt 400px op default', () => {
    expect(kdsColumnWidthPx('default')).toBe(KDS_COLUMN_WIDTH_PX)
    expect(KDS_COLUMN_WIDTH_PX).toBe(400)
  })

  it('gebruikt compacte kolom op wide15', () => {
    expect(kdsColumnWidthPx('wide15')).toBe(KDS_COLUMN_WIDTH_WIDE15_PX)
    expect(KDS_COLUMN_WIDTH_WIDE15_PX).toBe(300)
  })

  it('gebruikt smalle kolom op ipad_10', () => {
    expect(kdsColumnWidthPx('ipad10')).toBe(KDS_COLUMN_WIDTH_IPAD10_PX)
    expect(KDS_COLUMN_WIDTH_IPAD10_PX).toBe(285)
    expect(kitchenKdsDensityFromViewportProfileId('ipad_10')).toBe('ipad10')
  })
})
