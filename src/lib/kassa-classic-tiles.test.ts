import {
  kassaClassicMenuTileInteractionClass,
  kassaClassicTileBlueClass,
  KASSA_CLASSIC_TILE_BLUES,
  KASSA_CLASSIC_TILE_FACE,
  KASSA_CLASSIC_TILE_FACE_FLAT,
  ohGreenClassicFlatMenuTiles,
} from './kassa-classic-tiles'

describe('kassaClassicTileBlueClass', () => {
  it('geeft per rij een andere navy-toon bij 6 kolommen', () => {
    expect(kassaClassicTileBlueClass(0, 6)).toBe(`${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[0]}`)
    expect(kassaClassicTileBlueClass(5, 6)).toBe(`${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[0]}`)
    expect(kassaClassicTileBlueClass(6, 6)).toBe(`${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[1]}`)
    expect(kassaClassicTileBlueClass(12, 6)).toBe(`${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[2]}`)
  })

  it('gebruikt 5 kolommen op SXGA-dicht raster', () => {
    expect(kassaClassicTileBlueClass(4, 5)).toBe(`${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[0]}`)
    expect(kassaClassicTileBlueClass(5, 5)).toBe(`${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[1]}`)
    expect(kassaClassicTileBlueClass(10, 5)).toBe(`${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[2]}`)
  })

  it('flat chrome: geen shadow op tegel, geen tik-klassen', () => {
    expect(kassaClassicTileBlueClass(0, 6, true)).toBe(`${KASSA_CLASSIC_TILE_FACE_FLAT} bg-[#2f6fad]`)
    expect(kassaClassicMenuTileInteractionClass(true)).toBe('')
    expect(kassaClassicMenuTileInteractionClass(false)).toContain('active:scale')
  })

  it('ohGreenClassicFlatMenuTiles alleen ohgreen + klassiek', () => {
    expect(ohGreenClassicFlatMenuTiles('ohgreen', true)).toBe(true)
    expect(ohGreenClassicFlatMenuTiles('oh-green', true)).toBe(true)
    expect(ohGreenClassicFlatMenuTiles('demo-frituur', true)).toBe(false)
    expect(ohGreenClassicFlatMenuTiles('ohgreen', false)).toBe(false)
  })
})
