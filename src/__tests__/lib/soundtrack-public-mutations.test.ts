import {
  isSoundtrackPublicMutationName,
  sanitizeSoundtrackMutationInput,
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
      'createManualPlaylist',
    ])
  })

  it('rejects custom BFF mutation aliases', () => {
    expect(isSoundtrackPublicMutationName('playPlaylistTrack')).toBe(false)
    expect(isSoundtrackPublicMutationName('soundZoneAssignSource')).toBe(true)
    expect(isSoundtrackPublicMutationName('createManualPlaylist')).toBe(true)
  })

  it('soundZoneAssignSource: sourceTrackIndex zero-based, strips conflicting track id', () => {
    const out = sanitizeSoundtrackMutationInput('soundZoneAssignSource', {
      source: 'pl-1',
      sourceTrackIndex: 4,
      track: 'track-wrong',
      immediate: true,
    })
    expect(out).toEqual({
      source: 'pl-1',
      sourceTrackIndex: 4,
      immediate: true,
    })
  })
})
