import { orderTrackIdsFromStart } from '@/lib/soundtrack/soundtrack-manual-playlist-sync'

describe('orderTrackIdsFromStart', () => {
  it('rotates to start track for Soundtrack setPlayFrom', () => {
    expect(orderTrackIdsFromStart(['a', 'b', 'c'], 'b')).toEqual(['b', 'c', 'a'])
  })

  it('leaves order when start is first or missing', () => {
    expect(orderTrackIdsFromStart(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(orderTrackIdsFromStart(['a', 'b'], undefined)).toEqual(['a', 'b'])
  })
})
