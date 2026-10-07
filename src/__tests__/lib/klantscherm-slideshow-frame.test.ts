import {
  KLANTSCHERM_SLIDE_FRAME_CLASS,
  klantschermSlideBackdropStyle,
} from '@/lib/klantscherm-slideshow-frame'

describe('klantscherm slideshow frame', () => {
  it('uses fixed 16:9 frame class', () => {
    expect(KLANTSCHERM_SLIDE_FRAME_CLASS).toContain('aspect-video')
  })

  it('escapes quotes in backdrop url', () => {
    expect(klantschermSlideBackdropStyle('https://x.com/a"b.jpg').backgroundImage).toContain('%22')
  })
})
