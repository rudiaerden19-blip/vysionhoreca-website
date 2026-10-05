import {
  VYSION_MUSIC_DRAG_TRACK_MIME,
  readDragTrack,
  writeDragTrack,
} from '@/lib/vysion-music-drag-track'

describe('vysion-music-drag-track', () => {
  it('round-trips track payload via DataTransfer', () => {
    const store: Record<string, string> = {}
    const dt = {
      effectAllowed: '',
      setData(type: string, val: string) {
        store[type] = val
      },
      getData(type: string) {
        return store[type] ?? ''
      },
    } as unknown as DataTransfer

    writeDragTrack(dt, {
      id: 't1',
      name: 'Song',
      artist: 'Artist',
      durationMs: 120000,
      imageUrl: null,
    })

    expect(dt.getData(VYSION_MUSIC_DRAG_TRACK_MIME)).toContain('t1')
    const read = readDragTrack(dt)
    expect(read?.id).toBe('t1')
    expect(read?.name).toBe('Song')
  })
})
