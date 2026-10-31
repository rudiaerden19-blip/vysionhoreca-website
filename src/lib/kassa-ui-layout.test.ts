import {
  isMissingKassaUiLayoutColumn,
  KASSA_UI_LAYOUT_OPTIONS,
  kassaUiLayoutIsDark,
  kassaUiLayoutUsesPosLuxury,
  parseKassaUiLayout,
  resolveKassaUiLayout,
} from './kassa-ui-layout'
import {
  kassaPosButtonClass,
  kassaPosCheckoutButtonClass,
  kassaSpeelsCategoryStripButtonClass,
  kassaSpeelsOrderTypeButtonClass,
  kassaPosCartTrashButtonClass,
  kassaPosQuickMenuPanelButtonClass,
} from './kassa-pos-surface'

describe('parseKassaUiLayout', () => {
  it('houdt een geldige id', () => {
    expect(parseKassaUiLayout('dark', true)).toBe('dark')
    expect(parseKassaUiLayout('speels', false)).toBe('speels')
  })

  it('mapt oude ids', () => {
    expect(parseKassaUiLayout('slate', true)).toBe('dark')
    expect(parseKassaUiLayout('navy', false)).toBe('speels')
    expect(parseKassaUiLayout('luxe', true)).toBe('speels')
  })

  it('valt terug op speels als donker, light als licht', () => {
    expect(parseKassaUiLayout(null, true)).toBe('speels')
    expect(parseKassaUiLayout(undefined, null)).toBe('speels')
    expect(parseKassaUiLayout('nope', false)).toBe('light')
  })
})

describe('resolveKassaUiLayout', () => {
  it('houdt de server-id als die bekend is', () => {
    expect(resolveKassaUiLayout('dark', true, 'speels')).toBe('dark')
    expect(resolveKassaUiLayout('light', true, 'speels')).toBe('light')
  })

  it('gebruikt de lokale keuze als de server geen layout heeft', () => {
    expect(resolveKassaUiLayout(null, true, 'dark')).toBe('dark')
    expect(resolveKassaUiLayout(undefined, true, 'light')).toBe('light')
    expect(resolveKassaUiLayout(null, true, 'luxe')).toBe('speels')
  })

  it('valt alleen terug op speels zonder server- of lokale id', () => {
    expect(resolveKassaUiLayout(null, true, null)).toBe('speels')
    expect(resolveKassaUiLayout(null, false, null)).toBe('light')
  })
})

describe('KASSA_UI_LAYOUT_OPTIONS', () => {
  it('Light, Dark (speels) en Klassiek — geen Luxe meer', () => {
    expect(KASSA_UI_LAYOUT_OPTIONS.map((o) => o.id)).toEqual(['light', 'speels', 'dark'])
    expect(KASSA_UI_LAYOUT_OPTIONS[1]?.labelKey).toBe('kassaApp.modeDark')
  })
})

describe('kassaUiLayout flags', () => {
  it('alleen light is niet-donker', () => {
    expect(kassaUiLayoutIsDark('light')).toBe(false)
    expect(kassaUiLayoutIsDark('dark')).toBe(true)
    expect(kassaUiLayoutIsDark('speels')).toBe(true)
  })

  it('POS-chrome alleen voor speels (Dark)', () => {
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
  it('laat ongeselecteerde Speels-knoppen zonder beige rand', () => {
    expect(kassaPosButtonClass(false, 'speels')).not.toContain('#d4b483')
  })

  it('houdt champagne rand alleen op legacy luxe-snelmenu helper', () => {
    expect(kassaPosQuickMenuPanelButtonClass('luxe')).toContain('#d4b483')
    expect(kassaPosQuickMenuPanelButtonClass('speels')).not.toContain('#d4b483')
    expect(kassaPosQuickMenuPanelButtonClass('speels')).toContain('kassa-speels-blue-gloss-btn')
  })

  it('maakt geselecteerde Speels-knoppen zwart glanzend', () => {
    const selected = kassaPosButtonClass(true, 'speels')
    expect(selected).toContain('kassa-speels-black-gloss-btn')
    expect(selected).not.toContain('#c4a46a')
  })

  it('maakt Afrekenen in Speels groen glanzend', () => {
    expect(kassaPosCheckoutButtonClass('speels')).toContain('kassa-speels-green-gloss-btn')
    expect(kassaPosCheckoutButtonClass('speels')).not.toContain('kassa-speels-black-gloss-btn')
  })

  it('maakt mand-vuilbak in Speels rood glanzend als Verwijder', () => {
    expect(kassaPosCartTrashButtonClass(false, 'speels')).toContain('kassa-speels-red-gloss-btn')
    expect(kassaPosCartTrashButtonClass(false, 'luxe')).not.toContain('kassa-speels-red-gloss-btn')
  })

  it('maakt Speels-categoriebalk donkerblauw glanzend (actief lichter blauw)', () => {
    expect(kassaSpeelsCategoryStripButtonClass(false)).toContain('kassa-speels-blue-gloss-btn')
    expect(kassaSpeelsCategoryStripButtonClass(true)).toContain('kassa-speels-blue-gloss-btn--selected')
    expect(kassaSpeelsCategoryStripButtonClass(false)).not.toContain('kassa-speels-black-gloss-btn')
  })

  it('maakt geselecteerd besteltype speels donkerblauw; rest grijs chrome', () => {
    expect(kassaSpeelsOrderTypeButtonClass(true)).toContain('kassa-speels-blue-gloss-btn')
    expect(kassaSpeelsOrderTypeButtonClass(true)).not.toContain('kassa-speels-blue-gloss-btn--selected')
    expect(kassaSpeelsOrderTypeButtonClass(true)).toContain('kassa-speels-order-type-btn--selected')
    expect(kassaSpeelsOrderTypeButtonClass(false)).toContain('kassa-speels-order-type-btn')
  })
})
