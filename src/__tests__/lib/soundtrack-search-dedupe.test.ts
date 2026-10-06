import { dedupeSearchTrackRows, type SoundtrackSearchDedupeRow } from '@/lib/soundtrack/soundtrack-search-dedupe'

function row(
  partial: Partial<SoundtrackSearchDedupeRow> & Pick<SoundtrackSearchDedupeRow, 'id'>,
): SoundtrackSearchDedupeRow {
  return {
    name: 'Red Red Wine',
    artist: 'UB40',
    ...partial,
  }
}

describe('dedupeSearchTrackRows', () => {
  it('dedupes same title+artist with different track ids', () => {
    const a = row({ id: 't1' })
    const b = row({ id: 't2' })
    expect(dedupeSearchTrackRows([a, b])).toEqual([a])
  })

  it('dedupes same title+artist regardless of differing extra fields', () => {
    const a = row({ id: 't1' })
    const b = row({ id: 't2' })
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
