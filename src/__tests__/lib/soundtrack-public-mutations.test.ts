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
    ])
  })

  it('rejects custom BFF mutation aliases', () => {
    expect(isSoundtrackPublicMutationName('playPlaylistTrack')).toBe(false)
    expect(isSoundtrackPublicMutationName('soundZoneAssignSource')).toBe(true)
  })

  it('playlist track: prefers official track id over sourceTrackIndex', () => {
    const out = sanitizeSoundtrackMutationInput('soundZoneAssignSource', {
      source: 'pl-1',
      sourceTrackIndex: 4,
      track: 'soundtrack:track:abc',
      immediate: true,
      debugUiPosition: 5,
      debugTrackId: 'track-a',
    })
    expect(out).toEqual({
      source: 'pl-1',
      track: 'soundtrack:track:abc',
      immediate: true,
    })
  })

  it('playlist track: sourceTrackIndex zero-based when no track id', () => {
    const out = sanitizeSoundtrackMutationInput('soundZoneAssignSource', {
      source: 'pl-1',
      sourceTrackIndex: 4,
      immediate: true,
    })
    expect(out).toEqual({
      source: 'pl-1',
      sourceTrackIndex: 4,
      immediate: true,
    })
  })
})
