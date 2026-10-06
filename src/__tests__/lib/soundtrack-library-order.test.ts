import {
  dedupeLibraryRowsPreserveOrder,
  orderLibraryRowsByIds,
} from '@/lib/soundtrack/soundtrack-playlists'

describe('dedupeLibraryRowsPreserveOrder', () => {
  it('keeps Soundtrack desktop order (no alphabetical sort)', () => {
    const rows = [
      {
        id: '1',
        name: 'AFSPEELLIJST',
        sourceTypename: 'Playlist',
        snapshot: null,
        sourceKind: 'playlist' as const,
        imageUrl: null,
      },
      {
        id: '2',
        name: 'Modern Jazz',
        sourceTypename: 'Playlist',
        snapshot: null,
        sourceKind: 'soundtrack' as const,
        imageUrl: null,
      },
      {
        id: '3',
        name: 'Dream House',
        sourceTypename: 'Playlist',
        snapshot: null,
        sourceKind: 'soundtrack' as const,
        imageUrl: null,
      },
    ]
    expect(dedupeLibraryRowsPreserveOrder(rows).map((r) => r.name)).toEqual([
      'AFSPEELLIJST',
      'Modern Jazz',
      'Dream House',
    ])
  })

  it('orders rows by musicLibrary.ids from Soundtrack API', () => {
    const byId = new Map(
      [
        {
          id: '1',
          name: 'B',
          sourceTypename: 'Playlist',
          snapshot: null,
          sourceKind: 'playlist' as const,
          imageUrl: null,
        },
        {
          id: '2',
          name: 'A',
          sourceTypename: 'Playlist',
          snapshot: null,
          sourceKind: 'playlist' as const,
          imageUrl: null,
        },
      ].map((r) => [r.id, r]),
    )
    expect(orderLibraryRowsByIds(['2', '1'], byId).map((r) => r.name)).toEqual(['A', 'B'])
  })

  it('drops duplicate ids keeping first occurrence', () => {
    const rows = [
      {
        id: 'a',
        name: 'First',
        sourceTypename: 'Playlist',
        snapshot: null,
        sourceKind: 'playlist' as const,
        imageUrl: null,
      },
      {
        id: 'a',
        name: 'Dup',
        sourceTypename: 'Playlist',
        snapshot: null,
        sourceKind: 'playlist' as const,
        imageUrl: null,
      },
    ]
    expect(dedupeLibraryRowsPreserveOrder(rows)).toHaveLength(1)
    expect(dedupeLibraryRowsPreserveOrder(rows)[0]?.name).toBe('First')
  })
})
