/**
 * Horeca-kassa: vast AZERTY-schermtoetsenbord (pilot tenant lomichillplay).
 * Uitbreiding naar alle tenants: hier of tenant_settings vlag koppelen.
 */

const KASSA_AZERTY_OSK_PILOT_SLUG = 'lomichillplay'

export function isKassaAzertyOskEnabled(tenantSlug: string): boolean {
  return tenantSlug.trim().toLowerCase() === KASSA_AZERTY_OSK_PILOT_SLUG
}

export function parseTenantSlugFromShopPath(pathOrNext: string): string | null {
  const raw = pathOrNext.trim()
  if (!raw) return null
  const m = raw.match(/^\/shop\/([^/?#]+)/i)
  return m?.[1]?.toLowerCase() ?? null
}

export function resolveAzertyOskTenantSlug(input: {
  pathname: string
  routeParamTenant?: string
  searchNext?: string | null
  hostTenantSlug?: string | null
}): string | null {
  const route = (input.routeParamTenant || '').trim().toLowerCase()
  if (route) return route

  const path = (input.pathname || '').split('?')[0].replace(/\/+$/, '')
  const fromPath = parseTenantSlugFromShopPath(path)
  if (fromPath) return fromPath

  if (input.searchNext) {
    try {
      const dec = decodeURIComponent(input.searchNext.trim())
      const fromNext = parseTenantSlugFromShopPath(dec)
      if (fromNext) return fromNext
    } catch {
      /* ignore bad next */
    }
  }

  const host = (input.hostTenantSlug || '').trim().toLowerCase()
  return host || null
}

const OWNER_LOGIN_PATHS = new Set([
  '/login',
  '/login/forgot-password',
  '/login/reset-password',
  '/login/troubleshooting',
])

/**
 * Admin, zaak-login (/login?next=…), account-login — geen marketing-home.
 */
export function isTenantAzertyOskRoute(pathname: string, tenantSlug: string): boolean {
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '').toLowerCase()
  const slug = tenantSlug.trim().toLowerCase()
  if (!slug) return false
  if (path.startsWith(`/shop/${slug}/admin`)) return true
  if (path === `/shop/${slug}/account/login`) return true
  if (OWNER_LOGIN_PATHS.has(path)) return true
  return false
}

/** Zaak-login op www heeft vaak geen ?next= — pilot OSK toch op /login. */
export function isAzertyOskPilotOwnerLoginPath(pathname: string): boolean {
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '').toLowerCase()
  return OWNER_LOGIN_PATHS.has(path)
}

export function isAzertyOskActiveForSession(input: {
  pathname: string
  routeParamTenant?: string
  searchNext?: string | null
  hostTenantSlug?: string | null
}): boolean {
  if (
    isAzertyOskPilotOwnerLoginPath(input.pathname) &&
    isKassaAzertyOskEnabled(KASSA_AZERTY_OSK_PILOT_SLUG)
  ) {
    return true
  }
  const tenant = resolveAzertyOskTenantSlug(input)
  if (!tenant || !isKassaAzertyOskEnabled(tenant)) return false
  return isTenantAzertyOskRoute(input.pathname, tenant)
}

export const KASSA_AZERTY_NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const

/** Belgisch AZERTY (kleine letters) — rijen 2–4. */
export const KASSA_AZERTY_LETTER_ROWS = [
  ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
  ['w', 'x', 'c', 'v', 'b', 'n', ',', '.', '-'],
] as const

const AZERTY_SHIFT_MAP: Record<string, string> = {
  ',': '?',
  '.': ':',
  '-': '_',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '0': '0',
}

export function kassaAzertyKeyDisplay(key: string, shift: boolean): string {
  if (!shift) return key
  const mapped = AZERTY_SHIFT_MAP[key]
  if (mapped) return mapped
  return key.length === 1 ? key.toUpperCase() : key
}

/** @ toets — apart van letters/cijfers. */
export const KASSA_AZERTY_AT_CHAR = '@' as const

const OSK_SKIP_INPUT_TYPES = new Set([
  'hidden',
  'checkbox',
  'radio',
  'file',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'image',
])

function isOskIgnoredHiddenCapture(el: HTMLElement): boolean {
  if (el.getAttribute('data-osk-ignore') !== 'true') return false
  if (el.getAttribute('aria-hidden') === 'true') return true
  return el.tabIndex < 0 && el.classList.contains('pointer-events-none')
}

/**
 * Elk echt admin-tekstveld (tekst, e-mail, tel, prijs, …) — geen checkbox/hidden/barcode-vangst.
 */
export function isKassaAzertyOskTextTarget(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement {
  if (!target || !(target instanceof HTMLElement)) return false
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false
  if (isOskIgnoredHiddenCapture(target)) return false
  if (target.getAttribute('data-kassa-osk-skip') === 'true') return false
  if (target.getAttribute('aria-hidden') === 'true') return false
  if (target.disabled) return false
  if (target instanceof HTMLInputElement) {
    const type = (target.type || 'text').toLowerCase()
    if (OSK_SKIP_INPUT_TYPES.has(type)) return false
    if (target.readOnly && target.getAttribute('data-kassa-osk-force') !== 'true') return false
  }
  return true
}

const inputValueSetter =
  typeof window !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    : undefined

const textareaValueSetter =
  typeof window !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    : undefined

export function readKassaOskFieldValue(el: HTMLInputElement | HTMLTextAreaElement): string {
  return el.value
}

function writeNativeValue(el: HTMLInputElement | HTMLTextAreaElement, next: string): void {
  if (el instanceof HTMLInputElement && inputValueSetter) {
    inputValueSetter.call(el, next)
  } else if (el instanceof HTMLTextAreaElement && textareaValueSetter) {
    textareaValueSetter.call(el, next)
  } else {
    el.value = next
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

export function applyKassaAzertyOskEdit(
  el: HTMLInputElement | HTMLTextAreaElement,
  edit: 'backspace' | 'space' | { char: string },
): void {
  const max = el.maxLength > 0 ? el.maxLength : undefined
  let value = readKassaOskFieldValue(el)

  if (edit === 'backspace') {
    value = value.slice(0, -1)
  } else if (edit === 'space') {
    value = `${value} `
  } else {
    value = `${value}${edit.char}`
  }

  if (max !== undefined && value.length > max) {
    value = value.slice(0, max)
  }

  writeNativeValue(el, value)
}

export function armKassaOskInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  /** Geen readOnly — op touch verliest dat anders meteen focus (potlood/notitie). */
  el.inputMode = 'none'
  el.setAttribute('autocomplete', 'off')
  el.setAttribute('enterkeyhint', 'done')
  el.setAttribute('data-kassa-osk-armed', 'true')
}

export function disarmKassaOskInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.removeAttribute('inputMode')
  el.removeAttribute('data-kassa-osk-armed')
}
