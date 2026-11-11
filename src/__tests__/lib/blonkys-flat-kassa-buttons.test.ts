import {
  blonkysSpeelsCategoryStripButtonClass,
  blonkysSpeelsQuickMenuPanelButtonClass,
  isBlonkysFlatBlackKassaTenant,
} from '@/lib/blonkys-flat-kassa-buttons'

describe('isBlonkysFlatBlackKassaTenant', () => {
  it('geldt alleen voor restaurant en eethuis slug', () => {
    expect(isBlonkysFlatBlackKassaTenant('blonkys-restaurant')).toBe(true)
    expect(isBlonkysFlatBlackKassaTenant('blonkysrestaurant')).toBe(true)
    expect(isBlonkysFlatBlackKassaTenant('blonkyseethuis')).toBe(true)
    expect(isBlonkysFlatBlackKassaTenant('blonkys-snackbar')).toBe(false)
  })

  it('geldt niet voor andere zaken', () => {
    expect(isBlonkysFlatBlackKassaTenant('demo-frituur')).toBe(false)
    expect(isBlonkysFlatBlackKassaTenant('the-lagoon')).toBe(false)
    expect(isBlonkysFlatBlackKassaTenant('blonkys')).toBe(false)
    expect(isBlonkysFlatBlackKassaTenant('')).toBe(false)
  })

  it('gebruikt grijs speels-chrome voor categorie en snelmenu', () => {
    expect(blonkysSpeelsCategoryStripButtonClass(false)).toContain('kassa-speels-category-strip-btn')
    expect(blonkysSpeelsCategoryStripButtonClass(false)).not.toContain('kassa-speels-blue-gloss-btn')
    expect(blonkysSpeelsQuickMenuPanelButtonClass()).toContain('kassa-speels-black-gloss-btn')
    expect(blonkysSpeelsQuickMenuPanelButtonClass()).not.toContain('kassa-speels-blue-gloss-btn')
  })
})
