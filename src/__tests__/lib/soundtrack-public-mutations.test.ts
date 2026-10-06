import {
  isSoundtrackPublicMutationName,
  SOUNDTRACK_PUBLIC_MUTATION_NAMES,
} from '@/lib/soundtrack/soundtrack-public-mutations'

describe('Soundtrack Public API mutation names', () => {
  it('exposes only documented GraphQL mutations', () => {
    expect(SOUNDTRACK_PUBLIC_MUTATION_NAMES).toEqual([
      'play',
      'pause',
      'setPlayFrom',
      'soundZoneAssignSource',
      'soundZoneQueueTracks',
      'skipTrack',
      'skipTracks',
      'setVolume',
    ])
  })

  it('rejects custom BFF mutation aliases', () => {
    expect(isSoundtrackPublicMutationName('playPlaylistTrack')).toBe(false)
    expect(isSoundtrackPublicMutationName('soundZoneAssignSource')).toBe(true)
  })
})
