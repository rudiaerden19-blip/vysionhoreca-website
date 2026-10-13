import {
  eurosToJetonCents,
  kassaJetonChipFaceLabel,
  kassaJetonBreakdownFromCents,
  kassaJetonChangeFromBlackReceived,
  kassaJetonChangeFromReceived,
  kassaJetonChangeFromTender,
  normalizeKassaJetonDenominations,
} from '@/lib/kassa-jeton-math'

const DEN = normalizeKassaJetonDenominations(300, 50)

describe('kassa-jeton-math', () => {
  it('€10,50 → 3 zwarte + 3 witte', () => {
    expect(kassaJetonBreakdownFromCents(1050, DEN)).toEqual({
      black: 3,
      white: 3,
    })
  })

  it('4 zwarte voor €10,50 → 3 witte terug', () => {
    const r = kassaJetonChangeFromTender(
      1050,
      { black: 4, white: 0 },
      DEN,
    )
    expect(r.change).toEqual({ black: 0, white: 3 })
    expect(r.changeCents).toBe(150)
    expect(r.sufficient).toBe(true)
    expect(r.netCents).toBe(1050)
  })

  it('te weinig ontvangen', () => {
    const r = kassaJetonChangeFromTender(
      1050,
      { black: 3, white: 0 },
      DEN,
    )
    expect(r.sufficient).toBe(false)
    expect(r.changeCents).toBe(-150)
  })

  it('exact passend — geen teruggeven', () => {
    const r = kassaJetonChangeFromTender(
      1050,
      { black: 3, white: 3 },
      DEN,
    )
    expect(r.change).toEqual({ black: 0, white: 0 })
    expect(r.sufficient).toBe(true)
  })

  it('eurosToJetonCents', () => {
    expect(eurosToJetonCents(10.5)).toBe(1050)
  })

  it('chip face labels', () => {
    expect(kassaJetonChipFaceLabel(300)).toBe('3')
    expect(kassaJetonChipFaceLabel(50)).toBe('0,50')
  })

  it('€3,50 — 2 zwarte ontvangen → 5 witte terug', () => {
    const r = kassaJetonChangeFromBlackReceived(350, 2, DEN)
    expect(r.whiteChange).toBe(5)
    expect(r.changeCents).toBe(250)
    expect(r.sufficient).toBe(true)
  })

  it('€7,00 — 1 zwarte + 8 witte ontvangen → exact', () => {
    const r = kassaJetonChangeFromReceived(700, { black: 1, white: 8 }, DEN)
    expect(r.receivedCents).toBe(700)
    expect(r.whiteChange).toBe(0)
    expect(r.sufficient).toBe(true)
  })

  it('€7,00 — te veel betaald → wisselgeld alleen wit', () => {
    const r = kassaJetonChangeFromReceived(700, { black: 2, white: 8 }, DEN)
    expect(r.receivedCents).toBe(1000)
    expect(r.whiteChange).toBe(6)
    expect(r.sufficient).toBe(true)
  })
})
