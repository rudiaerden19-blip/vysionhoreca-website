/** Lokale Vysion Print Agent: http://127.0.0.1:9742 (Windows) of Android kiosk-app (NanoHTTP / intent). */

const DEFAULT_AGENT_ORIGIN = 'http://127.0.0.1:9742'

/** APK package voor `intent:#Intent…` (manifest `applicationId`). */
const ANDROID_KIOSK_PACKAGE = 'com.vysion.kiosk'

/** Geen intents > ~60kB — Chrome/OS kan lange URIs kapotknippen. */
const MAX_INTENT_URI_LENGTH = 60_000

export type VysionPrintAgentItem = {
  quantity: number
  name: string
  price: number
  choices?: { name: string; price: number }[]
}

export type VysionPrintAgentOrderData = {
  orderNumber: number | string
  orderType?: string
  tableNumber?: number | string | null
  items: VysionPrintAgentItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod?: string
}

export type VysionPrintAgentBusinessInfo = {
  name?: string
  address?: string
  postalCode?: string
  city?: string
  phone?: string
  vatNumber?: string
  website?: string
  vatRate?: number
}

export type VysionPrintAgentBody = {
  winkelnaam?: string
  storeName?: string
  bonInhoud: string
  receiptText?: string
  orderData?: VysionPrintAgentOrderData
  businessInfo?: VysionPrintAgentBusinessInfo
  copies?: number
  /** Open kassa-lade (drawer-kick) na het printen. */
  openDrawer?: boolean
  /** "kassa" (default, volledige bon) of "keuken" (compacte keukenbon). */
  receiptMode?: 'kassa' | 'keuken'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAndroidUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /\bAndroid\b/i.test(navigator.userAgent ?? '')
}

/** Gelijk aan POST /print body (JSON object). */
function buildPrintWireObject(body: VysionPrintAgentBody): Record<string, unknown> {
  return {
    winkelnaam: body.winkelnaam ?? body.storeName,
    storeName: body.storeName ?? body.winkelnaam,
    bonInhoud: body.bonInhoud ?? body.receiptText ?? '',
    receiptText: body.receiptText ?? body.bonInhoud ?? '',
    orderData: body.orderData,
    businessInfo: body.businessInfo,
    copies: body.copies,
    openDrawer: body.openDrawer === true,
    receiptMode: body.receiptMode || 'kassa',
  }
}

/** Kassa-bon voor deep link inkorten: ESC/POS op Android heeft `bonInhoud`; `orderData` maakt URLs enorm én redundant. Keuken: `orderData` behouden. */
function slimBodyForAndroidIntent(body: VysionPrintAgentBody): VysionPrintAgentBody {
  if (body.receiptMode === 'keuken') {
    return body
  }
  return {
    winkelnaam: body.winkelnaam ?? body.storeName,
    storeName: body.storeName ?? body.winkelnaam,
    bonInhoud: body.bonInhoud ?? body.receiptText ?? '',
    receiptText: body.receiptText ?? body.bonInhoud ?? '',
    copies: body.copies,
    openDrawer: body.openDrawer,
    receiptMode: body.receiptMode || 'kassa',
  }
}

function rawBase64Utf8(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return btoa(bin)
}

/**
 * Chrome-Android blokkeert custom schemes in iframe; naasync fetch is ook geen gesture meer.
 * `intent:` + navigatie wordt wél veel vaker gerouteerd naar de kiosk-app.
 */
function buildAndroidPrintIntentHref(body: VysionPrintAgentBody): string | null {
  try {
    if (typeof window === 'undefined') return null
    const slim = slimBodyForAndroidIntent(body)
    const json = JSON.stringify(buildPrintWireObject(slim))
    const b64 = rawBase64Utf8(json)
    const dEnc = encodeURIComponent(b64)

    let href =
      `intent://print?d=${dEnc}` +
      `#Intent;scheme=vysionkiosk;package=${ANDROID_KIOSK_PACKAGE}`

    const back = `${window.location.origin}${window.location.pathname}${window.location.search}`
    href += ';S.browser_fallback_url=' + encodeURIComponent(back || window.location.href)
    href += ';end'

    return href.length > MAX_INTENT_URI_LENGTH ? null : href
  } catch {
    return null
  }
}

function invokeAndroidPrintIntentNavigate(body: VysionPrintAgentBody): boolean {
  if (!isAndroidUa() || typeof window === 'undefined') return false
  const href = buildAndroidPrintIntentHref(body)
  if (!href) return false
  try {
    window.location.href = href
    return true
  } catch {
    return false
  }
}

function invokeAndroidDrawerIntentNavigate(): boolean {
  if (!isAndroidUa() || typeof window === 'undefined') return false
  try {
    let href = `intent://drawer/#Intent;scheme=vysionkiosk;package=${ANDROID_KIOSK_PACKAGE}`
    const back = `${window.location.origin}${window.location.pathname}${window.location.search}`
    href += ';S.browser_fallback_url=' + encodeURIComponent(back || window.location.href)
    href += ';end'

    if (href.length > MAX_INTENT_URI_LENGTH) return false
    window.location.href = href
    return true
  } catch {
    return false
  }
}

async function postPrintOnce(
  body: VysionPrintAgentBody,
  origin: string,
): Promise<boolean> {
  /** Hard timeout zodat een hangende agent de UI niet 30s vastzet. */
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPrintWireObject(body)),
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'

    const r = await fetch(`${origin.replace(/\/$/, '')}/print`, init)
    const data = (await r.json().catch(() => null)) as { success?: boolean } | null
    return r.ok && data?.success === true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function sendToVysionPrintAgent(
  body: VysionPrintAgentBody,
  origin = DEFAULT_AGENT_ORIGIN,
): Promise<boolean> {
  const base = origin.replace(/\/$/, '')
  /** Android‑Chrome: eerst kiosk‑intent — HTTPS→localhost faalt vrijwel altijd zonder foutmodal. */
  if (isAndroidUa() && invokeAndroidPrintIntentNavigate(body)) return true

  /** Agent kan net opstarten na login; korte retries voorkomen onnodige HTML-bon. */
  const attempts = 5
  const gapMs = 400
  for (let i = 0; i < attempts; i++) {
    if (await postPrintOnce(body, base)) return true
    if (i < attempts - 1) await sleep(gapMs)
  }
  if (invokeAndroidPrintIntentNavigate(body)) return true
  return false
}

/**
 * Stuurt enkel een drawer-kick (kassa-lade open) naar de Print Agent.
 * Gebruikt door de "Lade open"-knop in de kassa-UI.
 */
export async function openCashDrawer(origin = DEFAULT_AGENT_ORIGIN): Promise<boolean> {
  const base = origin.replace(/\/$/, '')
  /** Zelfde patroon als print: eerst kiosk‑intent op Android (Chrome blokkeert vaak localhost). */
  if (isAndroidUa() && invokeAndroidDrawerIntentNavigate()) return true

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'
    const r = await fetch(`${base}/drawer`, init)
    const data = (await r.json().catch(() => null)) as { success?: boolean } | null
    if (r.ok && data?.success === true) return true
  } catch {
    /* kiosk intent mogelijk nodig op Android‑Chrome */
  } finally {
    clearTimeout(timer)
  }
  if (invokeAndroidDrawerIntentNavigate()) return true
  return false
}
