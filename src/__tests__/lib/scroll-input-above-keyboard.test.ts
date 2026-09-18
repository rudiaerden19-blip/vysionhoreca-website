import {
  isEditableCatalogTextField,
  isTouchLikePointer,
  keyboardBottomReservePx,
  keyboardCoverPxFromViewport,
  scrollDeltaToRevealInput,
} from '@/lib/scroll-input-above-keyboard'

describe('keyboardCoverPxFromViewport', () => {
  it('is 0 zonder visualViewport-krimp', () => {
    expect(
      keyboardCoverPxFromViewport({
        innerHeight: 1024,
        visualViewport: { offsetTop: 0, height: 1024 },
      }),
    ).toBe(0)
  })

  it('meet de OSK-strook onderaan', () => {
    expect(
      keyboardCoverPxFromViewport({
        innerHeight: 1024,
        visualViewport: { offsetTop: 0, height: 700 },
      }),
    ).toBe(324)
  })
})

describe('isTouchLikePointer', () => {
  it('herkent kassa-touch, niet een muis-desktop', () => {
    expect(isTouchLikePointer({ pointerCoarse: true, hoverNone: true })).toBe(true)
    expect(isTouchLikePointer({ pointerCoarse: false, hoverNone: true })).toBe(true)
    expect(isTouchLikePointer({ pointerCoarse: false, hoverNone: false })).toBe(false)
  })
})

describe('keyboardBottomReservePx', () => {
  it('gebruikt echte cover als visualViewport krimpt', () => {
    expect(
      keyboardBottomReservePx({ keyboardCoverPx: 320, innerHeight: 1024, touchLike: true }),
    ).toBe(320)
  })

  it('reserveert op touch als Windows de OSK niet in visualViewport zet', () => {
    expect(
      keyboardBottomReservePx({ keyboardCoverPx: 0, innerHeight: 1024, touchLike: true }),
    ).toBe(Math.max(Math.round(1024 * 0.38), 260))
  })

  it('reserveert niets op muis-desktop', () => {
    expect(
      keyboardBottomReservePx({ keyboardCoverPx: 0, innerHeight: 1024, touchLike: false }),
    ).toBe(0)
  })
})

describe('scrollDeltaToRevealInput', () => {
  it('schuift omhoog als het vak onder de veilige rand valt', () => {
    expect(
      scrollDeltaToRevealInput({
        inputTop: 800,
        inputBottom: 850,
        safeTop: 64,
        safeBottom: 700,
      }),
    ).toBe(150)
  })

  it('doet niets als het vak al zichtbaar is', () => {
    expect(
      scrollDeltaToRevealInput({
        inputTop: 120,
        inputBottom: 170,
        safeTop: 64,
        safeBottom: 700,
      }),
    ).toBe(0)
  })
})

describe('isEditableCatalogTextField', () => {
  it('neemt tekstvelden mee en slaat hidden/scan-velden over', () => {
    const text = document.createElement('input')
    text.type = 'text'
    expect(isEditableCatalogTextField(text)).toBe(true)

    const hidden = document.createElement('input')
    hidden.type = 'hidden'
    expect(isEditableCatalogTextField(hidden)).toBe(false)

    const scan = document.createElement('input')
    scan.type = 'text'
    scan.tabIndex = -1
    scan.setAttribute('aria-hidden', 'true')
    scan.className = 'pointer-events-none'
    expect(isEditableCatalogTextField(scan)).toBe(false)

    const ignore = document.createElement('input')
    ignore.type = 'text'
    ignore.setAttribute('data-osk-ignore', 'true')
    expect(isEditableCatalogTextField(ignore)).toBe(false)
  })
})
