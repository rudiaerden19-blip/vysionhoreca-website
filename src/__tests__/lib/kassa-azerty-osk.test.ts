import {
  applyKassaAzertyOskEdit,
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

  it('healOskBlockedTextField verwijdert inputMode=none na pilot-resten', () => {
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
