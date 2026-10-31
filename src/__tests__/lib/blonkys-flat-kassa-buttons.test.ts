import { isBlonkysFlatBlackKassaTenant } from '@/lib/blonkys-flat-kassa-buttons'

describe('isBlonkysFlatBlackKassaTenant', () => {
  it('geldt voor restaurant en snackbar/eethuis', () => {
    expect(isBlonkysFlatBlackKassaTenant('blonkys-restaurant')).toBe(true)
    expect(isBlonkysFlatBlackKassaTenant('blonkyseethuis')).toBe(true)
    expect(isBlonkysFlatBlackKassaTenant('blonkys-snackbar')).toBe(true)
  })

  it('geldt niet voor andere zaken', () => {
    expect(isBlonkysFlatBlackKassaTenant('demo-frituur')).toBe(false)
    expect(isBlonkysFlatBlackKassaTenant('the-lagoon')).toBe(false)
    expect(isBlonkysFlatBlackKassaTenant('blonkys')).toBe(false)
    expect(isBlonkysFlatBlackKassaTenant('')).toBe(false)
  })
})
