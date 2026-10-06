import { skipSoundZoneTracks } from '@/lib/soundtrack/soundtrack-server'

describe('soundtrack player commands', () => {
  it('skipSoundZoneTracks is exported for playlist index jumps', () => {
    expect(typeof skipSoundZoneTracks).toBe('function')
  })
})
