import {
  KDS_COLUMN_WIDTH_PX,
  KDS_COLUMN_WIDTH_WIDE15_PX,
  kdsColumnWidthPx,
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
})
