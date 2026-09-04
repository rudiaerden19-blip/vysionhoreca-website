import { kassaClassicTileBlueClass, KASSA_CLASSIC_TILE_BLUES } from './kassa-classic-tiles'

describe('kassaClassicTileBlueClass', () => {
  it('geeft per rij een andere blauwtoon bij 6 kolommen', () => {
    expect(kassaClassicTileBlueClass(0, 6)).toBe(KASSA_CLASSIC_TILE_BLUES[0])
    expect(kassaClassicTileBlueClass(5, 6)).toBe(KASSA_CLASSIC_TILE_BLUES[0])
    expect(kassaClassicTileBlueClass(6, 6)).toBe(KASSA_CLASSIC_TILE_BLUES[1])
    expect(kassaClassicTileBlueClass(12, 6)).toBe(KASSA_CLASSIC_TILE_BLUES[2])
  })

  it('gebruikt 5 kolommen op SXGA-dicht raster', () => {
    expect(kassaClassicTileBlueClass(4, 5)).toBe(KASSA_CLASSIC_TILE_BLUES[0])
    expect(kassaClassicTileBlueClass(5, 5)).toBe(KASSA_CLASSIC_TILE_BLUES[1])
    expect(kassaClassicTileBlueClass(10, 5)).toBe(KASSA_CLASSIC_TILE_BLUES[2])
  })
})
