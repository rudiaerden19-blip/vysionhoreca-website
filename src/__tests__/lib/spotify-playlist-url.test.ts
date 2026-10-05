import { parseSpotifyPlaylistId } from '@/lib/spotify-playlist-url'

describe('parseSpotifyPlaylistId', () => {
  it('parses open.spotify.com playlist URL', () => {
    expect(
      parseSpotifyPlaylistId(
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc',
      ),
    ).toBe('37i9dQZF1DXcBWIGoYBM5M')
  })

  it('parses spotify URI', () => {
    expect(parseSpotifyPlaylistId('spotify:playlist:abc123XYZ')).toBe('abc123XYZ')
  })

  it('rejects non-playlist', () => {
    expect(parseSpotifyPlaylistId('https://open.spotify.com/track/xyz')).toBeNull()
    expect(parseSpotifyPlaylistId('')).toBeNull()
  })
})
