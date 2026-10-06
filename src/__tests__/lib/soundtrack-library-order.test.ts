import { dedupeLibraryRowsPreserveOrder } from '@/lib/soundtrack/soundtrack-playlists'

describe('dedupeLibraryRowsPreserveOrder', () => {
  it('keeps Soundtrack desktop order (no alphabetical sort)', () => {
    const rows = [
      { id: '1', name: 'AFSPEELLIJST', sourceKind: 'playlist' as const, imageUrl: null },
      { id: '2', name: 'Modern Jazz', sourceKind: 'soundtrack' as const, imageUrl: null },
      { id: '3', name: 'Dream House', sourceKind: 'soundtrack' as const, imageUrl: null },
    ]
    expect(dedupeLibraryRowsPreserveOrder(rows).map((r) => r.name)).toEqual([
      'AFSPEELLIJST',
      'Modern Jazz',
      'Dream House',
    ])
  })

  it('drops duplicate ids keeping first occurrence', () => {
    const rows = [
      { id: 'a', name: 'First', sourceKind: 'playlist' as const, imageUrl: null },
      { id: 'a', name: 'Dup', sourceKind: 'playlist' as const, imageUrl: null },
    ]
    expect(dedupeLibraryRowsPreserveOrder(rows)).toHaveLength(1)
    expect(dedupeLibraryRowsPreserveOrder(rows)[0]?.name).toBe('First')
  })
})
