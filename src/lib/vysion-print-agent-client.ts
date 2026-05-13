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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** UTF-8 → base64 (browser-safe). */
function utf8ToBase64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}

function isAndroidUserAgent(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')
}

/**
 * Fallback wanneer fetch naar 127.0.0.1 faalt (typisch Android Chrome vanaf HTTPS):
 * kort `vysionkiosk://`-intent naar de Vysion Kiosk-app.
 */
function tryDispatchVysionKioskPrint(body: VysionPrintAgentBody): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (!isAndroidUserAgent()) return false
  try {
    const payload = JSON.stringify({
      winkelnaam: body.winkelnaam ?? body.storeName,
      storeName: body.storeName ?? body.winkelnaam,
      bonInhoud: body.bonInhoud ?? body.receiptText ?? '',
      receiptText: body.receiptText ?? body.bonInhoud ?? '',
      orderData: body.orderData,
      businessInfo: body.businessInfo,
      copies: body.copies,
      openDrawer: body.openDrawer === true,
      receiptMode: body.receiptMode || 'kassa',
    })
    const d = utf8ToBase64(payload)
    const url = `vysionkiosk://print?d=${encodeURIComponent(d)}`
    const iframe = document.createElement('iframe')
    iframe.setAttribute('style', 'display:none;width:0;height:0;border:0')
    iframe.src = url
    document.body.appendChild(iframe)
    window.setTimeout(() => {
      try {
        iframe.remove()
      } catch {
        /* ignore */
      }
    }, 1500)
    return true
  } catch {
    return false
  }
}

function tryDispatchVysionKioskDrawer(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (!isAndroidUserAgent()) return false
  try {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('style', 'display:none;width:0;height:0;border:0')
    iframe.src = 'vysionkiosk://drawer'
    document.body.appendChild(iframe)
    window.setTimeout(() => {
      try {
        iframe.remove()
      } catch {
        /* ignore */
      }
    }, 1500)
    return true
  } catch {
    return false
  }
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
      body: JSON.stringify({
        winkelnaam: body.winkelnaam ?? body.storeName,
        storeName: body.storeName ?? body.winkelnaam,
        bonInhoud: body.bonInhoud ?? body.receiptText ?? '',
        receiptText: body.receiptText ?? body.bonInhoud ?? '',
        orderData: body.orderData,
        businessInfo: body.businessInfo,
        copies: body.copies,
        openDrawer: body.openDrawer === true,
        receiptMode: body.receiptMode || 'kassa',
      }),
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
  if (tryDispatchVysionKioskPrint(body)) return true
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
    /* mislukt → Android Kiosk fallback hieronder */
  } finally {
    clearTimeout(timer)
  }
  if (tryDispatchVysionKioskDrawer()) return true
  return false
}
