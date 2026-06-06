'use client'

import { authFetch } from '@/lib/auth-headers'

type Result<T> = { ok: true; data?: T; status: number } | { ok: false; error?: string; status: number }

async function post<T>(body: Record<string, unknown>): Promise<Result<T>> {
  try {
    const res = await authFetch('/api/gks-kassa/commercial-orders', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    let json: { data?: T; error?: string } | null = null
    try {
      json = await res.json()
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}`, status: res.status }
    }
    return { ok: true, data: json?.data, status: res.status }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'network'
    return { ok: false, error: msg, status: 0 }
  }
}

export const gksCommercialOrders = {
  select<T>(tenantSlug: string, opts?: { statusIn?: string[]; match?: Record<string, unknown>; limit?: number }) {
    return post<T>({
      op: 'select',
      tenantSlug,
      statusIn: opts?.statusIn,
      match: opts?.match,
      limit: opts?.limit,
    })
  },

  insert<T>(tenantSlug: string, row: Record<string, unknown>, select?: string) {
    return post<T>({ op: 'insert', tenantSlug, row, select })
  },

  update<T>(tenantSlug: string, row: Record<string, unknown>, match: Record<string, unknown>) {
    return post<T>({ op: 'update', tenantSlug, row, match })
  },

  delete(tenantSlug: string, match: Record<string, unknown>) {
    return post<unknown>({ op: 'delete', tenantSlug, match })
  },

  fetchOrderNumberByKassaClientUuid(tenantSlug: string, kassaClientUuid: string) {
    return post<{ order_number?: number }>({
      op: 'order_number_by_uuid',
      tenantSlug,
      kassaClientUuid,
    })
  },
}

export function isDuplicateGksKassaClientViolation(error?: string): boolean {
  if (!error) return false
  return /duplicate|unique|23505/i.test(error)
}
