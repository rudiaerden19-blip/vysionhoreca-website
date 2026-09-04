import {
  isMissingKassaUiLayoutColumn,
  KASSA_UI_LAYOUT_OPTIONS,
  kassaUiLayoutIsDark,
  kassaUiLayoutUsesPosLuxury,
  parseKassaUiLayout,
} from './kassa-ui-layout'
import { kassaPosButtonClass, kassaPosCheckoutButtonClass } from './kassa-pos-surface'

describe('parseKassaUiLayout', () => {
  it('houdt een geldige id', () => {
    expect(parseKassaUiLayout('dark', true)).toBe('dark')
    expect(parseKassaUiLayout('speels', false)).toBe('speels')
  })

  it('mapt oude ids', () => {
    expect(parseKassaUiLayout('slate', true)).toBe('dark')
    expect(parseKassaUiLayout('navy', false)).toBe('speels')
  })

  it('valt terug op luxe als donker, light als licht', () => {
    expect(parseKassaUiLayout(null, true)).toBe('luxe')
    expect(parseKassaUiLayout(undefined, null)).toBe('luxe')
    expect(parseKassaUiLayout('nope', false)).toBe('light')
  })
})

describe('KASSA_UI_LAYOUT_OPTIONS', () => {
  it('zet de huidige Speels-look als Dark onder Light', () => {
    expect(KASSA_UI_LAYOUT_OPTIONS.map((o) => o.id)).toEqual(['light', 'speels', 'luxe', 'dark'])
    expect(KASSA_UI_LAYOUT_OPTIONS[1]?.labelKey).toBe('kassaApp.modeDark')
  })
})

describe('kassaUiLayout flags', () => {
  it('alleen light is niet-donker', () => {
    expect(kassaUiLayoutIsDark('light')).toBe(false)
    expect(kassaUiLayoutIsDark('luxe')).toBe(true)
    expect(kassaUiLayoutIsDark('dark')).toBe(true)
    expect(kassaUiLayoutIsDark('speels')).toBe(true)
  })

  it('POS-luxe alleen voor luxe en speels', () => {
    expect(kassaUiLayoutUsesPosLuxury('luxe')).toBe(true)
    expect(kassaUiLayoutUsesPosLuxury('speels')).toBe(true)
    expect(kassaUiLayoutUsesPosLuxury('dark')).toBe(false)
    expect(kassaUiLayoutUsesPosLuxury('light')).toBe(false)
  })
})

describe('isMissingKassaUiLayoutColumn', () => {
  it('herkent PostgREST/Postgres kolomfouten', () => {
    expect(
      isMissingKassaUiLayoutColumn({
        message: "Could not find the 'kassa_ui_layout' column of 'kassa_pos_state' in the schema cache",
        code: 'PGRST204',
      }),
    ).toBe(true)
    expect(isMissingKassaUiLayoutColumn({ code: '42703', message: 'undefined_column' })).toBe(true)
    expect(isMissingKassaUiLayoutColumn({ message: 'permission denied for table kassa_pos_state' })).toBe(
      false,
    )
  })
})

describe('Speels bruine knoppen', () => {
  it('laat ongeselecteerde knoppen ongewijzigd', () => {
    expect(kassaPosButtonClass(false, 'speels')).toBe(kassaPosButtonClass(false))
  })

  it('maakt geselecteerde knoppen zwart met zilveren rand', () => {
    const selected = kassaPosButtonClass(true, 'speels')
    expect(selected).toContain('#c8c8c8')
    expect(selected).not.toContain('#c4a46a')
    expect(kassaPosButtonClass(true, 'luxe')).toContain('#c4a46a')
  })

  it('maakt Afrekenen in Speels zwart met zilveren rand', () => {
    expect(kassaPosCheckoutButtonClass('speels')).toContain('#c8c8c8')
    expect(kassaPosCheckoutButtonClass('speels')).not.toContain('#c4a46a')
    expect(kassaPosCheckoutButtonClass('luxe')).toContain('#c4a46a')
  })
})
