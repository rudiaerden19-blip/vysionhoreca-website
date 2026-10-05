import { kassaHelpVideoMaxCssSize } from '@/lib/kassa-help-video-display'

describe('kassa-help-video-display', () => {
  it('caps CSS size at native pixels per device pixel ratio', () => {
    expect(kassaHelpVideoMaxCssSize(1920, 1080, 2)).toEqual({
      maxWidthPx: 960,
      maxHeightPx: 540,
    })
    expect(kassaHelpVideoMaxCssSize(1920, 1080, 1)).toEqual({
      maxWidthPx: 1920,
      maxHeightPx: 1080,
    })
  })
})
