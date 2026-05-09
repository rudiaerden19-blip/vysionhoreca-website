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
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postPrintOnce(
  body: VysionPrintAgentBody,
  origin: string
): Promise<boolean> {
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winkelnaam: body.winkelnaam ?? body.storeName,
        bonInhoud: body.bonInhoud ?? body.receiptText ?? '',
      }),
      mode: 'cors',
      credentials: 'omit',
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'

    const r = await fetch(`${origin.replace(/\/$/, '')}/print`, init)
    const data = (await r.json().catch(() => null)) as { success?: boolean } | null
    return r.ok && data?.success === true
  } catch {
    return false
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
  return false
}
