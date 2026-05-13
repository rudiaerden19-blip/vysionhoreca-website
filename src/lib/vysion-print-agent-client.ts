/** Lokale Vysion Print Agent: http://127.0.0.1:9742 (Windows) of Android kiosk-app (NanoHTTP). */

const DEFAULT_AGENT_ORIGIN = 'http://127.0.0.1:9742'

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

/** Base64 van UTF‑8‑JSON voor query `d` (Android kiosk `PrintBridgeActivity`). */
function utf8StringToUrlBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return encodeURIComponent(btoa(bin))
}

/**
 * HTTPS-pagina in Chrome‑Android blokkeert vaak fetch naar localhost.
 * Fallback: kiosk-app via `vysionkiosk://` (intent); geen retourstatus mogelijk → optimistisch `true`.
 */
function invokeAndroidKioskPrintBridge(body: VysionPrintAgentBody): boolean {
  if (!isAndroidUa()) return false
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  try {
    const json = JSON.stringify(buildPrintWireObject(body))
    const url = `vysionkiosk://print?d=${utf8StringToUrlBase64(json)}`
    const f = document.createElement('iframe')
    f.style.cssText =
      'position:fixed;top:-120px;width:2px;height:2px;border:0;opacity:0;pointer-events:none'
    f.setAttribute('aria-hidden', 'true')
    f.src = url
    document.body.appendChild(f)
    window.setTimeout(() => {
      try {
        f.remove()
      } catch {
        /* ignore */
      }
    }, 2500)
    return true
  } catch {
    return false
  }
}

function invokeAndroidKioskDrawerBridge(): boolean {
  if (!isAndroidUa()) return false
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  try {
    const f = document.createElement('iframe')
    f.style.cssText =
      'position:fixed;top:-120px;width:2px;height:2px;border:0;opacity:0;pointer-events:none'
    f.setAttribute('aria-hidden', 'true')
    f.src = 'vysionkiosk://drawer'
    document.body.appendChild(f)
    window.setTimeout(() => {
      try {
        f.remove()
      } catch {
        /* ignore */
      }
    }, 2500)
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
  /** Agent kan net opstarten na login; korte retries voorkomen onnodige HTML-bon. */
  const attempts = 5
  const gapMs = 400
  for (let i = 0; i < attempts; i++) {
    if (await postPrintOnce(body, base)) return true
    if (i < attempts - 1) await sleep(gapMs)
  }
  if (invokeAndroidKioskPrintBridge(body)) return true
  return false
}

/**
 * Stuurt enkel een drawer-kick (kassa-lade open) naar de Print Agent.
 * Gebruikt door de "Lade open"-knop in de kassa-UI.
 */
export async function openCashDrawer(origin = DEFAULT_AGENT_ORIGIN): Promise<boolean> {
  const base = origin.replace(/\/$/, '')
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
    /* kiosk bridge mogelijk nodig op Android‑Chrome */
  } finally {
    clearTimeout(timer)
  }
  if (invokeAndroidKioskDrawerBridge()) return true
  return false
}
