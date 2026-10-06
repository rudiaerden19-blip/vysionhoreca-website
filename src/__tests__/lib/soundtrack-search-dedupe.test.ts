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
  it('dedupes same title+artist with different track ids', () => {
    const a = row({ id: 't1' })
    const b = row({ id: 't2' })
    expect(dedupeSearchTrackRows([a, b])).toEqual([a])
  })

  it('dedupes same title+artist with different duration', () => {
    const a = row({ id: 't1', durationMs: 184_000 })
    const b = row({ id: 't2', durationMs: 183_000 })
    expect(dedupeSearchTrackRows([a, b])).toEqual([a])
  })

  it('normalizes case and spacing', () => {
    const a = row({ id: 't1', name: 'Red Red Wine', artist: 'UB40' })
    const b = row({ id: 't2', name: '  red   red   wine  ', artist: ' ub40 ' })
    expect(dedupeSearchTrackRows([a, b])).toEqual([a])
  })

  it('keeps different title or artist', () => {
    const a = row({ id: 't1' })
    const b = row({ id: 't2', name: 'Other Song' })
    expect(dedupeSearchTrackRows([a, b])).toHaveLength(2)
  })
})
