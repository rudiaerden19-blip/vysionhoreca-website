import { buildPlaylistQueueTrackIds } from '@/components/vysion-music/vysion-music-playlist-queue'

describe('buildPlaylistQueueTrackIds', () => {
  const tracks = [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }, { id: 't5' }]

  it('queues from clicked index through end (5 → 5,6,…)', () => {
    expect(buildPlaylistQueueTrackIds(tracks, 4, 't5')).toEqual(['t5'])
    expect(buildPlaylistQueueTrackIds(tracks, 0, 't1')).toEqual(['t1', 't2', 't3', 't4', 't5'])
    expect(buildPlaylistQueueTrackIds(tracks, 1, 't2')).toEqual(['t2', 't3', 't4', 't5'])
  })

  it('falls back to clicked id when slice empty', () => {
    expect(buildPlaylistQueueTrackIds([], 0, 'solo')).toEqual(['solo'])
  })
})
