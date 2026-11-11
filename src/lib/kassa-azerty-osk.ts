import {
  dispatchKassaOskProgrammaticValue,
  isKassaOskReactControlledSyncField,
  setNativeInputValue,
} from '@/lib/dom-input-value'
import { readKassaIpadClientFromWindow } from '@/lib/kassa-viewport-profile'
import {
  readKassaViewportProfileIdFromWindow,
  type KassaViewportProfileId,
} from '@/lib/kassa-viewport-profile-id'

const KASSA_TABLET_VIEWPORT_PROFILES = new Set<KassaViewportProfileId>(['ipad_10', 'ipad_129'])

/**
 * Horeca-kassa: vast AZERTY-schermtoetsenbord (alle tenants).
 */

/**
 * Zet op false om AZERTY OSK platformbreed uit te schakelen.
 */
export const KASSA_AZERTY_OSK_LIVE = true

/**
 * Toetsenbord alleen na tik op «Toetsenbord» (opmerking-velden mogen OSK nog wel focussen).
 */
export const KASSA_AZERTY_OSK_MANUAL_OPEN = true

/** Zelfde blauw als admin «Naar kassa» / POS-quicklink. */
export const KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS =
  'touch-manipulation [-webkit-tap-highlight-color:transparent] inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#58CCFF] px-3 py-2 text-sm font-bold text-[#063042] shadow-md transition-colors hover:bg-[#47c6fe] active:brightness-95 sm:px-4'

/** iPad: systeemtoetsenbord — géén Vysion AZERTY-balk (alle tenants + layout-lab ipad-profiel). */
export function isKassaCustomAzertyOskSuppressedOnIpad(): boolean {
  if (typeof window === 'undefined') return false
  if (readKassaIpadClientFromWindow()) return true
  try {
    const profile = readKassaViewportProfileIdFromWindow()
    return KASSA_TABLET_VIEWPORT_PROFILES.has(profile)
  } catch {
    return false
  }
}

export function isKassaAzertyOskManualOpenEnabled(tenantSlug: string): boolean {
  if (isKassaCustomAzertyOskSuppressedOnIpad()) return false
  if (!KASSA_AZERTY_OSK_LIVE || !KASSA_AZERTY_OSK_MANUAL_OPEN) return false
  return isKassaAzertyOskEnabled(tenantSlug)
}

export function isKassaAzertyOskEnabled(tenantSlug: string): boolean {
  if (!KASSA_AZERTY_OSK_LIVE) return false
  return tenantSlug.trim().length > 0
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

/** Eigenaar-login op www heeft vaak geen ?next= — OSK toch op /login (alle tenants). */
export function isOwnerLoginPathForAzertyOsk(pathname: string): boolean {
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '').toLowerCase()
  return OWNER_LOGIN_PATHS.has(path)
}

export function isAzertyOskActiveForSession(input: {
  pathname: string
  routeParamTenant?: string
  searchNext?: string | null
  hostTenantSlug?: string | null
}): boolean {
  if (!KASSA_AZERTY_OSK_LIVE) return false
  if (isKassaCustomAzertyOskSuppressedOnIpad()) return false
  if (isOwnerLoginPathForAzertyOsk(input.pathname)) {
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

export function readKassaOskFieldValue(el: HTMLInputElement | HTMLTextAreaElement): string {
  return el.value
}

type OskControlledFieldEdit = { value: string; caret: number }

const oskControlledFieldEdit = new WeakMap<
  HTMLInputElement | HTMLTextAreaElement,
  OskControlledFieldEdit
>()

/** Snel OSK-typetempo: DOM/React lopen achter — buffer per veld. */
export function seedKassaOskControlledFieldEditState(
  el: HTMLInputElement | HTMLTextAreaElement,
  value?: string,
  caret?: number,
): void {
  const v = value ?? readKassaOskFieldValue(el)
  const c = caret ?? el.selectionStart ?? v.length
  oskControlledFieldEdit.set(el, {
    value: v,
    caret: Math.max(0, Math.min(c, v.length)),
  })
}

export function clearKassaOskControlledFieldEditState(
  el: HTMLInputElement | HTMLTextAreaElement,
): void {
  oskControlledFieldEdit.delete(el)
}

export function readKassaOskControlledFieldEditState(
  el: HTMLInputElement | HTMLTextAreaElement,
): OskControlledFieldEdit {
  const tracked = oskControlledFieldEdit.get(el)
  const value = tracked?.value ?? readKassaOskFieldValue(el)
  const rawCaret = tracked?.caret ?? el.selectionStart ?? value.length
  return {
    value,
    caret: Math.max(0, Math.min(rawCaret, value.length)),
  }
}

function writeKassaOskControlledFieldEditState(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  caret: number,
): void {
  oskControlledFieldEdit.set(el, {
    value,
    caret: Math.max(0, Math.min(caret, value.length)),
  })
}

export type KassaAzertyOskEdit = 'backspace' | 'space' | { char: string }

export function kassaOskSelectionRange(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): { start: number; end: number } {
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  return {
    start: Math.max(0, Math.min(start, value.length)),
    end: Math.max(0, Math.min(end, value.length)),
  }
}

/** Pure edit — voor controlled sneltekst-slots (React-draft als bron). */
export function nextKassaAzertyOskEditValue(
  value: string,
  selection: { start: number; end: number },
  edit: KassaAzertyOskEdit,
  maxLength?: number,
): { next: string; caret: number } | null {
  const { start, end } = selection
  let next = value
  let caret = start

  if (edit === 'backspace') {
    if (start === end && start > 0) {
      next = value.slice(0, start - 1) + value.slice(end)
      caret = start - 1
    } else if (start !== end) {
      next = value.slice(0, start) + value.slice(end)
      caret = start
    } else {
      return null
    }
  } else if (edit === 'space') {
    next = `${value.slice(0, start)} ${value.slice(end)}`
    caret = start + 1
  } else {
    next = `${value.slice(0, start)}${edit.char}${value.slice(end)}`
    caret = start + edit.char.length
  }

  if (maxLength !== undefined && maxLength > 0 && next.length > maxLength) {
    next = next.slice(0, maxLength)
    caret = Math.min(caret, next.length)
  }

  return { next, caret }
}

export function applyKassaAzertyOskEdit(
  el: HTMLInputElement | HTMLTextAreaElement,
  edit: KassaAzertyOskEdit,
): void {
  const max = el.maxLength > 0 ? el.maxLength : undefined
  const useControlledBuffer = isKassaOskReactControlledSyncField(el)
  const { value, caret: caretStart } = useControlledBuffer
    ? readKassaOskControlledFieldEditState(el)
    : (() => {
        const v = readKassaOskFieldValue(el)
        const sel = kassaOskSelectionRange(el, v)
        return { value: v, caret: sel.start }
      })()

  const selection = { start: caretStart, end: caretStart }
  const result = nextKassaAzertyOskEditValue(
    value,
    useControlledBuffer ? selection : kassaOskSelectionRange(el, value),
    edit,
    max,
  )
  if (!result) return

  if (useControlledBuffer) {
    writeKassaOskControlledFieldEditState(el, result.next, result.caret)
    dispatchKassaOskProgrammaticValue(el, result.next)
    try {
      el.setSelectionRange(result.caret, result.caret)
    } catch {
      /* date/time, etc. */
    }
    return
  }

  setNativeInputValue(el, result.next)
  try {
    el.setSelectionRange(result.caret, result.caret)
  } catch {
    /* date/time, etc. */
  }
}

/** Alleen markeer — geen inputMode/readOnly (blokkeerde typen overal). */
export function armKassaOskInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.setAttribute('data-kassa-osk-armed', 'true')
}

export function disarmKassaOskInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  clearKassaOskControlledFieldEditState(el)
  el.removeAttribute('data-kassa-osk-armed')
  el.removeAttribute('inputMode')
  el.readOnly = false
}

export function disarmAllKassaOskInputs(root: ParentNode = document): void {
  root.querySelectorAll('[data-kassa-osk-armed="true"]').forEach((node) => {
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      disarmKassaOskInput(node)
    }
  })
}

/** Opruimen restanten inputMode=none van eerdere OSK-builds in de pagina. */
export function releaseLegacyOskInputGuards(root: ParentNode = document): void {
  root.querySelectorAll('input, textarea').forEach((node) => {
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return
    healOskBlockedTextField(node)
  })
}

/**
 * Eén veld na OSK/modal-wissel (product A → product B): geen blijvend inputMode=none.
 * Verborgen barcode-vangst en `data-keep-input-mode` blijven met rust.
 */
export function healOskBlockedTextField(el: HTMLInputElement | HTMLTextAreaElement): void {
  if (el.getAttribute('data-keep-input-mode') === 'none') return
  if (el.getAttribute('aria-hidden') === 'true' && el.tabIndex < 0) return
  if (el.getAttribute('data-kassa-osk-armed') === 'true') {
    disarmKassaOskInput(el)
    return
  }
  if (el.getAttribute('inputMode') === 'none' && isKassaAzertyOskTextTarget(el)) {
    el.removeAttribute('inputMode')
  }
}
