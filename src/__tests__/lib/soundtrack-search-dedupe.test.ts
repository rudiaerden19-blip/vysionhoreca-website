import { dedupeSearchTrackRows, type SoundtrackTrackRow } from '@/lib/soundtrack/soundtrack-server'

function row(partial: Partial<SoundtrackTrackRow> & Pick<SoundtrackTrackRow, 'id'>): SoundtrackTrackRow {
  return {
    name: 'Red Red Wine',
    artist: 'UB40',
    durationMs: 184_000,
    imageUrl: null,
    imageWidth: null,
    imageHeight: null,
    ...partial,
  }
}

describe('dedupeSearchTrackRows', () => {
  it('keeps first row per track id', () => {
    const a = row({ id: 't1' })
    const b = row({ id: 't1', name: 'Other title' })
    expect(dedupeSearchTrackRows([a, b])).toEqual([a])
  })

  it('dedupes different ids with same title artist duration', () => {
    const a = row({ id: 't1' })
    const b = row({ id: 't2' })
    expect(dedupeSearchTrackRows([a, b])).toEqual([a])
  })

  it('keeps different duration as separate version', () => {
    const a = row({ id: 't1', durationMs: 184_000 })
    const b = row({ id: 't2', durationMs: 200_000 })
    expect(dedupeSearchTrackRows([a, b])).toHaveLength(2)
  })
})
