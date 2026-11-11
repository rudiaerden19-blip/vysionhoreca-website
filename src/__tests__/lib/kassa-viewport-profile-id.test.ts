import {
  resolveKassaViewportProfileIdFromWindow,
  type KassaViewportProfileId,
} from '@/lib/kassa-viewport-profile-id'

function expectProfile(
  input: Parameters<typeof resolveKassaViewportProfileIdFromWindow>[0],
  id: KassaViewportProfileId,
) {
  expect(resolveKassaViewportProfileIdFromWindow(input)).toBe(id)
}

describe('resolveKassaViewportProfileIdFromWindow', () => {
  it('iPad-client wint vóór wide15 (echte 1080×810 en 1180×820)', () => {
    expectProfile(
      { wide15: true, sxgaDense: false, ipadClient: true, cssW: 1080, cssH: 810 },
      'ipad_10',
    )
    expectProfile(
      { wide15: true, sxgaDense: false, ipadClient: true, cssW: 1180, cssH: 820 },
      'ipad_10',
    )
    expectProfile(
      { wide15: true, sxgaDense: false, ipadClient: true, cssW: 1194, cssH: 834 },
      'ipad_10',
    )
  })

  it('iPad Pro 12.9″-klasse → ipad_129', () => {
    expectProfile(
      { wide15: false, sxgaDense: false, ipadClient: true, cssW: 1366, cssH: 1024 },
      'ipad_129',
    )
  })

  it('desktop wide15 blijft wide15 zonder ipad-client', () => {
    expectProfile(
      { wide15: true, sxgaDense: false, ipadClient: false, cssW: 1366, cssH: 768 },
      'wide15',
    )
  })
})
