'use client'

export type WebshopStoredCartItem = {
  id: string
  name: string
  price: number
  quantity: number
  options: { name: string; price: number }[]
  totalPrice: number
  image_url?: string
  notes?: string
}

export type WebshopBrowserSession = {
  cart: WebshopStoredCartItem[]
  whatsapp_phone: string | null
  shop_customer_id: string | null
}

function sessionCartKey(tenantSlug: string): string {
  return `vysion_wbs_cart_${tenantSlug}`
}

function legacyLocalCartKey(tenantSlug: string): string {
  return `cart_${tenantSlug}`
}

function parseStoredCart(raw: string | null): WebshopStoredCartItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as WebshopStoredCartItem[]
  } catch {
    return []
  }
}

/** Browser-backup als Supabase-tabel/cookie-sessie (nog) niet werkt — zelfde tab + refresh. */
export function readWebshopCartClientBackup(tenantSlug: string): WebshopStoredCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const fromSession = parseStoredCart(window.sessionStorage.getItem(sessionCartKey(tenantSlug)))
    if (fromSession.length > 0) return fromSession
    return parseStoredCart(window.localStorage.getItem(legacyLocalCartKey(tenantSlug)))
  } catch {
    return []
  }
}

export function writeWebshopCartClientBackup(tenantSlug: string, cart: WebshopStoredCartItem[]): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify(cart)
  try {
    window.sessionStorage.setItem(sessionCartKey(tenantSlug), payload)
  } catch {
    /* ignore */
  }
  try {
    if (cart.length === 0) {
      window.localStorage.removeItem(legacyLocalCartKey(tenantSlug))
    } else {
      window.localStorage.setItem(legacyLocalCartKey(tenantSlug), payload)
    }
  } catch {
    /* ignore */
  }
}

async function fetchWebshopBrowserSessionFromServer(tenantSlug: string): Promise<WebshopBrowserSession> {
  const empty: WebshopBrowserSession = { cart: [], whatsapp_phone: null, shop_customer_id: null }
  try {
    const res = await fetch(
      `/api/shop/browser-session?tenant_slug=${encodeURIComponent(tenantSlug)}`,
      { credentials: 'include', cache: 'no-store' },
    )
    const data = (await res.json()) as {
      ok?: boolean
      cart?: WebshopStoredCartItem[]
      whatsapp_phone?: string | null
      shop_customer_id?: string | null
    }
    if (!data.ok) return empty
    return {
      cart: Array.isArray(data.cart) ? data.cart : [],
      whatsapp_phone: data.whatsapp_phone ?? null,
      shop_customer_id: data.shop_customer_id ?? null,
    }
  } catch {
    return empty
  }
}

export async function fetchWebshopBrowserSession(tenantSlug: string): Promise<WebshopBrowserSession> {
  const fromServer = await fetchWebshopBrowserSessionFromServer(tenantSlug)
  if (fromServer.cart.length > 0) {
    writeWebshopCartClientBackup(tenantSlug, fromServer.cart)
    return fromServer
  }

  const backupCart = readWebshopCartClientBackup(tenantSlug)
  if (backupCart.length > 0) {
    void patchWebshopBrowserSession(tenantSlug, { cart: backupCart })
    return { ...fromServer, cart: backupCart }
  }

  return fromServer
}

export async function patchWebshopBrowserSession(
  tenantSlug: string,
  patch: Partial<{
    cart: WebshopStoredCartItem[]
    whatsapp_phone: string | null
    shop_customer_id: string | null
  }>,
): Promise<boolean> {
  if ('cart' in patch && Array.isArray(patch.cart)) {
    writeWebshopCartClientBackup(tenantSlug, patch.cart)
  }

  try {
    const res = await fetch('/api/shop/browser-session', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_slug: tenantSlug, ...patch }),
    })
    const data = (await res.json()) as { ok?: boolean }
    return !!data.ok
  } catch {
    return false
  }
}

/** Verwijder legacy webshop-keys (whatsapp/klant); mand blijft in backup tot server sync lukt. */
export function purgeLegacyWebshopLocalStorage(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  const keys = [`whatsapp_phone_${tenantSlug}`, `customer_${tenantSlug}`]
  for (const k of keys) {
    try {
      window.localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

/** Legacy localStorage → server-sessie + client-backup. */
export async function migrateLegacyWebshopLocalStorage(tenantSlug: string): Promise<void> {
  if (typeof window === 'undefined') return
  let legacyCart: WebshopStoredCartItem[] | null = null
  let legacyWa: string | null = null
  let legacyCustomer: string | null = null
  try {
    const rawCart = window.localStorage.getItem(legacyLocalCartKey(tenantSlug))
    if (rawCart) {
      const parsed = JSON.parse(rawCart) as unknown
      if (Array.isArray(parsed)) legacyCart = parsed as WebshopStoredCartItem[]
    }
    legacyWa = window.localStorage.getItem(`whatsapp_phone_${tenantSlug}`)
    legacyCustomer = window.localStorage.getItem(`customer_${tenantSlug}`)
  } catch {
    /* ignore */
  }

  const session = await fetchWebshopBrowserSessionFromServer(tenantSlug)
  const patch: Partial<{
    cart: WebshopStoredCartItem[]
    whatsapp_phone: string | null
    shop_customer_id: string | null
  }> = {}

  if (session.cart.length === 0 && legacyCart && legacyCart.length > 0) {
    patch.cart = legacyCart
    writeWebshopCartClientBackup(tenantSlug, legacyCart)
  }
  if (!session.whatsapp_phone && legacyWa) {
    patch.whatsapp_phone = legacyWa
  }
  if (!session.shop_customer_id && legacyCustomer) {
    patch.shop_customer_id = legacyCustomer
  }

  if (Object.keys(patch).length > 0) {
    await patchWebshopBrowserSession(tenantSlug, patch)
  }

  purgeLegacyWebshopLocalStorage(tenantSlug)
}
