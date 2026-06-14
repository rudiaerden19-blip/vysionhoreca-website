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

export async function fetchWebshopBrowserSession(tenantSlug: string): Promise<WebshopBrowserSession> {
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

export async function patchWebshopBrowserSession(
  tenantSlug: string,
  patch: Partial<{
    cart: WebshopStoredCartItem[]
    whatsapp_phone: string | null
    shop_customer_id: string | null
  }>,
): Promise<boolean> {
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

/** Verwijder legacy webshop-keys (eenmalig per pageload). */
export function purgeLegacyWebshopLocalStorage(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  const keys = [`cart_${tenantSlug}`, `whatsapp_phone_${tenantSlug}`, `customer_${tenantSlug}`]
  for (const k of keys) {
    try {
      window.localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

/** Eén keer legacy localStorage → server-sessie voordat keys gewist worden. */
export async function migrateLegacyWebshopLocalStorage(tenantSlug: string): Promise<void> {
  if (typeof window === 'undefined') return
  let legacyCart: WebshopStoredCartItem[] | null = null
  let legacyWa: string | null = null
  let legacyCustomer: string | null = null
  try {
    const rawCart = window.localStorage.getItem(`cart_${tenantSlug}`)
    if (rawCart) {
      const parsed = JSON.parse(rawCart) as unknown
      if (Array.isArray(parsed)) legacyCart = parsed as WebshopStoredCartItem[]
    }
    legacyWa = window.localStorage.getItem(`whatsapp_phone_${tenantSlug}`)
    legacyCustomer = window.localStorage.getItem(`customer_${tenantSlug}`)
  } catch {
    /* ignore */
  }

  const session = await fetchWebshopBrowserSession(tenantSlug)
  const patch: Partial<{
    cart: WebshopStoredCartItem[]
    whatsapp_phone: string | null
    shop_customer_id: string | null
  }> = {}

  if (session.cart.length === 0 && legacyCart && legacyCart.length > 0) {
    patch.cart = legacyCart
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
