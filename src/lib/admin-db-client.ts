/**
 * Client-side helper die admin-mutations naar `/api/admin/db` stuurt.
 *
 *   import { adminDb } from '@/lib/admin-db-client'
 *
 *   await adminDb.insert('menu_products', { tenant_slug, name, price })
 *   await adminDb.update('menu_products', { name }, { id, tenant_slug })
 *   await adminDb.upsert('tenant_settings', settings, { onConflict: 'tenant_slug' })
 *   await adminDb.delete('menu_products', { id, tenant_slug })
 *
 * De helper voegt automatisch:
 *   · auth-headers toe (`x-business-id` / `x-superadmin-id`)
 *   · `tenantSlug` uit `getCurrentTenantSlug()` als die niet expliciet meegegeven wordt
 *   · 8s timeout (Vercel default is 10s — we willen ruim binnen blijven)
 *
 * Geeft `{ ok: true, data }` of `{ ok: false, error }` terug. Geen exception tenzij
 * netwerkfout.
 */

'use client'

import { authFetch, getCurrentTenantSlug } from './auth-headers'

export type AdminDbOp = 'insert' | 'update' | 'upsert' | 'delete'

interface AdminDbResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  status: number
}

interface AdminDbExtraOptions {
  tenantSlug?: string
  onConflict?: string
  select?: string
  notes?: string
  signal?: AbortSignal
  /** Timeout in ms (default 8000) */
  timeoutMs?: number
}

async function call<T>(
  op: AdminDbOp,
  table: string,
  body: Record<string, unknown>,
  opts: AdminDbExtraOptions = {}
): Promise<AdminDbResult<T>> {
  const tenantSlug = opts.tenantSlug || getCurrentTenantSlug()
  if (!tenantSlug) {
    return { ok: false, error: 'Niet ingelogd', status: 401 }
  }

  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), opts.timeoutMs ?? 8_000)
  // Combineer een externe AbortSignal als die meegegeven is.
  const externalAbort = () => ac.abort()
  if (opts.signal) opts.signal.addEventListener('abort', externalAbort)

  try {
    const res = await authFetch('/api/admin/db', {
      method: 'POST',
      body: JSON.stringify({
        op,
        table,
        tenantSlug,
        onConflict: opts.onConflict,
        select: opts.select,
        notes: opts.notes,
        ...body,
      }),
      signal: ac.signal,
    })
    let json: any = null
    try { json = await res.json() } catch { /* res.json() kan falen bij timeouts */ }
    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}`, status: res.status }
    }
    return { ok: true, data: json?.data, status: res.status }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { ok: false, error: 'Timeout — agent traag of offline', status: 0 }
    }
    return { ok: false, error: err?.message || String(err), status: 0 }
  } finally {
    clearTimeout(timeout)
    if (opts.signal) opts.signal.removeEventListener('abort', externalAbort)
  }
}

export const adminDb = {
  insert<T = unknown>(table: string, data: Record<string, unknown> | Record<string, unknown>[], opts?: AdminDbExtraOptions) {
    return call<T>('insert', table, { data }, opts)
  },
  update<T = unknown>(table: string, data: Record<string, unknown>, where: Record<string, unknown>, opts?: AdminDbExtraOptions) {
    return call<T>('update', table, { data, where }, opts)
  },
  upsert<T = unknown>(table: string, data: Record<string, unknown> | Record<string, unknown>[], opts?: AdminDbExtraOptions) {
    return call<T>('upsert', table, { data }, opts)
  },
  delete<T = unknown>(table: string, where: Record<string, unknown>, opts?: AdminDbExtraOptions) {
    return call<T>('delete', table, { where }, opts)
  },
}
