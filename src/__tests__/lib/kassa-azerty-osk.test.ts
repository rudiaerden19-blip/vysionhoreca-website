import { KASSA_OSK_PROGRAMMATIC_INPUT_EVENT } from '@/lib/dom-input-value'
import {
  applyKassaAzertyOskEdit,
  nextKassaAzertyOskEditValue,
  readKassaOskControlledFieldEditState,
  seedKassaOskControlledFieldEditState,
  healOskBlockedTextField,
  isKassaAzertyOskEnabled,
  isKassaAzertyOskManualOpenEnabled,
  isKassaAzertyOskTextTarget,
  isAzertyOskActiveForSession,
  isTenantAzertyOskRoute,
  kassaAzertyKeyDisplay,
  resolveAzertyOskTenantSlug,
} from '@/lib/kassa-azerty-osk'

describe('kassa-azerty-osk', () => {
  it('azerty route op admin, zaak-login en account-login', () => {
    expect(isTenantAzertyOskRoute('/shop/lomichillplay/admin/producten', 'lomichillplay')).toBe(
      true,
    )
    expect(isTenantAzertyOskRoute('/shop/lomichillplay/account/login', 'lomichillplay')).toBe(true)
    expect(isTenantAzertyOskRoute('/login', 'lomichillplay')).toBe(true)
    expect(isTenantAzertyOskRoute('/', 'lomichillplay')).toBe(false)
  })

  it('active sessie via host, next of route-param', () => {
    expect(
      isAzertyOskActiveForSession({
        pathname: '/login',
      }),
    ).toBe(true)
    expect(
      isAzertyOskActiveForSession({
        pathname: '/shop/lomichillplay/admin/producten',
        routeParamTenant: 'lomichillplay',
      }),
    ).toBe(true)
    expect(
      isAzertyOskActiveForSession({
        pathname: '/shop/other/admin',
        routeParamTenant: 'other',
      }),
    ).toBe(true)
    expect(
      resolveAzertyOskTenantSlug({
        pathname: '/shop/lomichillplay/admin',
        routeParamTenant: 'lomichillplay',
      }),
    ).toBe('lomichillplay')
  })

  it('e-mail en tel openen os k', () => {
    const email = document.createElement('input')
    email.type = 'email'
    expect(isKassaAzertyOskTextTarget(email)).toBe(true)
    const tel = document.createElement('input')
    tel.type = 'tel'
    expect(isKassaAzertyOskTextTarget(tel)).toBe(true)
  })

  it('healOskBlockedTextField verwijdert inputMode=none na oude build-resten', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.setAttribute('inputMode', 'none')
    healOskBlockedTextField(input)
    expect(input.getAttribute('inputMode')).toBeNull()
  })

  it('azerty OSK voor elke tenant slug', () => {
    expect(isKassaAzertyOskEnabled('lomichillplay')).toBe(true)
    expect(isKassaAzertyOskEnabled('demo-frituur')).toBe(true)
    expect(isKassaAzertyOskEnabled(' ')).toBe(false)
  })

  it('handmatig openen volgt tenant enable', () => {
    expect(isKassaAzertyOskManualOpenEnabled('lomichillplay')).toBe(true)
    expect(isKassaAzertyOskManualOpenEnabled('demo-frituur')).toBe(true)
    expect(isKassaAzertyOskManualOpenEnabled('')).toBe(false)
  })

  it('shift voor letters en leestekens', () => {
    expect(kassaAzertyKeyDisplay('a', true)).toBe('A')
    expect(kassaAzertyKeyDisplay(',', true)).toBe('?')
  })

  it('readOnly sneltekst-slot met data-kassa-osk-force blijft OSK-doel', () => {
    const input = document.createElement('input')
    input.readOnly = true
    input.setAttribute('data-kassa-osk-force', 'true')
    input.setAttribute('data-kassa-osk-shortcut-slot', 'true')
    expect(isKassaAzertyOskTextTarget(input)).toBe(true)
  })

  it('slaat readOnly numpad display over', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.readOnly = true
    expect(isKassaAzertyOskTextTarget(input)).toBe(false)
  })

  it('data-osk-ignore alleen op verborgen barcode-vangst', () => {
    const hidden = document.createElement('input')
    hidden.type = 'text'
    hidden.setAttribute('data-osk-ignore', 'true')
    hidden.setAttribute('aria-hidden', 'true')
    expect(isKassaAzertyOskTextTarget(hidden)).toBe(false)
    const visible = document.createElement('input')
    visible.type = 'text'
    visible.setAttribute('data-osk-ignore', 'true')
    expect(isKassaAzertyOskTextTarget(visible)).toBe(true)
  })

  it('nextKassaAzertyOskEditValue: Zonder zout met spaties en dubbele letters', () => {
    let value = 'Z'
    const append = (ch: string) => {
      const r = nextKassaAzertyOskEditValue(
        value,
        { start: value.length, end: value.length },
        { char: ch },
      )
      expect(r).not.toBeNull()
      value = r!.next
    }
    for (const ch of 'onder') append(ch)
    const sp = nextKassaAzertyOskEditValue(
      value,
      { start: value.length, end: value.length },
      'space',
    )
    value = sp!.next
    for (const ch of 'zout') append(ch)
    expect(value).toBe('Zonder zout')
  })

  it('voegt spatie toe op caret', () => {
    const input = document.createElement('input')
    input.value = 'Jan'
    document.body.appendChild(input)
    input.setSelectionRange(3, 3)
    applyKassaAzertyOskEdit(input, 'space')
    expect(input.value).toBe('Jan ')
    input.setSelectionRange(0, 0)
    applyKassaAzertyOskEdit(input, 'space')
    expect(input.value).toBe(' Jan ')
    document.body.removeChild(input)
  })

  it('controlled opmerking: snelle opeenvolgende toetsen zonder verlies', () => {
    const input = document.createElement('input')
    input.setAttribute('data-kassa-osk-line-note', 'true')
    document.body.appendChild(input)
    let model = ''
    input.addEventListener(KASSA_OSK_PROGRAMMATIC_INPUT_EVENT, (e) => {
      model = (e as CustomEvent<{ value: string }>).detail.value
      input.value = model
      seedKassaOskControlledFieldEditState(input, model, model.length)
    })
    seedKassaOskControlledFieldEditState(input, '', 0)
    for (const ch of 'Zonder zout') {
      if (ch === ' ') {
        applyKassaAzertyOskEdit(input, 'space')
      } else {
        applyKassaAzertyOskEdit(input, { char: ch })
      }
    }
    expect(model).toBe('Zonder zout')
    expect(readKassaOskControlledFieldEditState(input).value).toBe('Zonder zout')
    document.body.removeChild(input)
  })

  it('voegt @ toe via apply edit', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    applyKassaAzertyOskEdit(input, { char: '@' })
    expect(input.value).toBe('@')
    document.body.removeChild(input)
  })

  it('past maxLength toe via input event', () => {
    const input = document.createElement('input')
    input.maxLength = 3
    document.body.appendChild(input)
    applyKassaAzertyOskEdit(input, { char: 'a' })
    applyKassaAzertyOskEdit(input, { char: 'b' })
    applyKassaAzertyOskEdit(input, { char: 'c' })
    applyKassaAzertyOskEdit(input, { char: 'd' })
    expect(input.value).toBe('abc')
    document.body.removeChild(input)
  })
})
