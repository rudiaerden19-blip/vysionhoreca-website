import type { Customer, Order } from '@/lib/admin-api'

function customerApiBase(tenantSlug: string): string {
  return `/api/shop/${encodeURIComponent(tenantSlug)}/customer`
}

type ApiCustomerResponse =
  | { ok: true; customer: Customer }
  | { ok: false; error?: string }

type ApiOrdersResponse = { ok: true; orders: Order[] } | { ok: false; error?: string }

export async function registerShopCustomerViaApi(
  tenantSlug: string,
  input: {
    email: string
    password: string
    name: string
    phone: string
    address: string
    postal_code: string
    city: string
  },
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const res = await fetch(`${customerApiBase(tenantSlug)}/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = (await res.json()) as ApiCustomerResponse
    if (data.ok && data.customer) {
      return { success: true, customer: data.customer }
    }
    if (!data.ok && data.error === 'email_in_use') {
      return { success: false, error: 'Email is al in gebruik' }
    }
    return { success: false, error: 'Registratie mislukt' }
  } catch {
    return { success: false, error: 'Registratie mislukt' }
  }
}

export async function loginShopCustomerViaApi(
  tenantSlug: string,
  email: string,
  password: string,
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const res = await fetch(`${customerApiBase(tenantSlug)}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = (await res.json()) as ApiCustomerResponse
    if (data.ok && data.customer) {
      return { success: true, customer: data.customer }
    }
    return { success: false, error: 'Onjuiste email of wachtwoord' }
  } catch {
    return { success: false, error: 'Onjuiste email of wachtwoord' }
  }
}

export async function fetchShopCustomerMe(tenantSlug: string): Promise<Customer | null> {
  try {
    const res = await fetch(`${customerApiBase(tenantSlug)}/me`, {
      credentials: 'include',
      cache: 'no-store',
    })
    if (res.status === 401) return null
    const data = (await res.json()) as ApiCustomerResponse
    if (data.ok && data.customer) return data.customer
    return null
  } catch {
    return null
  }
}

export async function patchShopCustomerMe(
  tenantSlug: string,
  updates: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'postal_code' | 'city'>>,
): Promise<boolean> {
  try {
    const res = await fetch(`${customerApiBase(tenantSlug)}/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

export async function fetchShopCustomerOrders(tenantSlug: string): Promise<Order[]> {
  try {
    const res = await fetch(`${customerApiBase(tenantSlug)}/orders`, {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = (await res.json()) as ApiOrdersResponse
    if (data.ok && Array.isArray(data.orders)) return data.orders
    return []
  } catch {
    return []
  }
}

export async function redeemShopRewardViaApi(
  tenantSlug: string,
  rewardId: string,
  pointsRequired: number,
): Promise<boolean> {
  try {
    const res = await fetch(`${customerApiBase(tenantSlug)}/redeem`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reward_id: rewardId, points_required: pointsRequired }),
    })
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

export async function deleteShopCustomerViaApi(tenantSlug: string): Promise<boolean> {
  try {
    const res = await fetch(`${customerApiBase(tenantSlug)}/me`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}
