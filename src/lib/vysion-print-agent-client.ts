/** Lokale Vysion Print Agent (Windows): http://127.0.0.1:9742 */

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

/** Zelfde JSON als POST /print — Android-app (PrintBridgeActivity) verwacht identieke structuur. */
function buildAgentRequestPayload(body: VysionPrintAgentBody) {
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

function isAndroidUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/** UTF-8 → Base64 zoals Android Base64.DEFAULT (standaard alphabet, geen regelbreuken). */
function utf8ToBase64Json(utf8Json: string): string {
  if (typeof btoa === 'undefined') return ''
  try {
    return btoa(unescape(encodeURIComponent(utf8Json)))
  } catch {
    return ''
  }
}

/**
 * Chrome op Android blokkeert vaak fetch naar http://127.0.0.1. De Vysion Kiosk-app registreert
 * vysionkiosk:// — zelfde payload als de Windows-agent, geen wijziging aan apps/vysion-print-agent.
 */
function tryVysionKioskPrintBridge(body: VysionPrintAgentBody): boolean {
  if (typeof document === 'undefined' || !isAndroidUserAgent()) return false
  const payload = buildAgentRequestPayload(body)
  let json: string
  try {
    json = JSON.stringify(payload)
  } catch {
    return false
  }
  const d = utf8ToBase64Json(json)
  if (!d) return false
  const url = `vysionkiosk://print?d=${encodeURIComponent(d)}`
  try {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.src = url
    document.body.appendChild(iframe)
    window.setTimeout(() => {
      try {
        document.body.removeChild(iframe)
      } catch {
        /* ignore */
      }
    }, 2500)
  } catch {
    return false
  }
  return true
}

function tryVysionKioskDrawerBridge(): boolean {
  if (typeof document === 'undefined' || !isAndroidUserAgent()) return false
  try {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = 'vysionkiosk://drawer'
    document.body.appendChild(iframe)
    window.setTimeout(() => {
      try {
        document.body.removeChild(iframe)
      } catch {
        /* ignore */
      }
    }, 2500)
  } catch {
    return false
  }
  return true
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postPrintOnce(
  body: VysionPrintAgentBody,
  origin: string
): Promise<boolean> {
  /** Hard timeout zodat een hangende agent de UI niet 30s vastzet. */
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAgentRequestPayload(body)),
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
  origin = DEFAULT_AGENT_ORIGIN
): Promise<boolean> {
  const base = origin.replace(/\/$/, '')
  /** Agent kan net opstarten na login; korte retries voorkomen onnodige HTML-bon. */
  const attempts = 5
  const gapMs = 400
  for (let i = 0; i < attempts; i++) {
    if (await postPrintOnce(body, base)) return true
    if (i < attempts - 1) await sleep(gapMs)
  }
  /** Windows-agent ongewijzigd: fetch blijft het primaire pad. Alleen als dat na retries faalt: Android Kiosk-bridge. */
  if (tryVysionKioskPrintBridge(body)) return true
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
    if (tryVysionKioskDrawerBridge()) return true
    return false
  } catch {
    if (tryVysionKioskDrawerBridge()) return true
    return false
  } finally {
    clearTimeout(timer)
  }
}
