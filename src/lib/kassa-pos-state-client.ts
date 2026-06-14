'use client'

import { authFetch } from '@/lib/auth-headers'
import type { BarBonWatermarkStore } from '@/lib/kassa-bar-bon-watermark'

export type KassaPosState = {
  active_staff_id: string | null
  active_staff_name: string | null
  kassa_ui_dark: boolean | null
  bar_bon_watermarks: BarBonWatermarkStore
}

const emptyState = (): KassaPosState => ({
  active_staff_id: null,
  active_staff_name: null,
  kassa_ui_dark: null,
  bar_bon_watermarks: {},
})

export async function fetchKassaPosState(tenantSlug: string): Promise<KassaPosState> {
  try {
    const res = await authFetch(
      `/api/kassa/pos-state?tenant_slug=${encodeURIComponent(tenantSlug)}`,
      { cache: 'no-store' },
    )
    const data = (await res.json()) as { ok?: boolean; state?: KassaPosState }
    if (!data.ok || !data.state) return emptyState()
    return {
      active_staff_id: data.state.active_staff_id ?? null,
      active_staff_name: data.state.active_staff_name ?? null,
      kassa_ui_dark: data.state.kassa_ui_dark ?? null,
      bar_bon_watermarks:
        data.state.bar_bon_watermarks && typeof data.state.bar_bon_watermarks === 'object'
          ? (data.state.bar_bon_watermarks as BarBonWatermarkStore)
          : {},
    }
  } catch {
    return emptyState()
  }
}

export async function patchKassaPosState(
  tenantSlug: string,
  patch: Partial<{
    active_staff_id: string | null
    active_staff_name: string | null
    kassa_ui_dark: boolean | null
    bar_bon_watermarks: BarBonWatermarkStore
  }>,
): Promise<KassaPosState | null> {
  try {
    const res = await authFetch('/api/kassa/pos-state', {
      method: 'PATCH',
      body: JSON.stringify({ tenant_slug: tenantSlug, ...patch }),
    })
    const data = (await res.json()) as { ok?: boolean; state?: KassaPosState }
    if (!data.ok || !data.state) return null
    return {
      active_staff_id: data.state.active_staff_id ?? null,
      active_staff_name: data.state.active_staff_name ?? null,
      kassa_ui_dark: data.state.kassa_ui_dark ?? null,
      bar_bon_watermarks:
        data.state.bar_bon_watermarks && typeof data.state.bar_bon_watermarks === 'object'
          ? (data.state.bar_bon_watermarks as BarBonWatermarkStore)
          : {},
    }
  } catch {
    return null
  }
}

/** Verwijder legacy kassa-keys uit localStorage (eenmalig per pageload). */
export function purgeLegacyKassaLocalStorage(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  const keys = [
    `vysion_settings_${tenantSlug}`,
    `vysion_kassa_active_staff_${tenantSlug}`,
    `vysion_kassa-pro-dark:v1:${tenantSlug}`,
    `vysion_table_orders_${tenantSlug}`,
    `vysion_menu_cats_${tenantSlug}`,
    `vysion_menu_prods_${tenantSlug}`,
    `vysion_menu_opts_${tenantSlug}`,
    `vysion_offline_orders_${tenantSlug}`,
    `vysion_kassa_bar_bon_watermark_v2_${tenantSlug}`,
    `vysion_stool_status_${tenantSlug}`,
    `vysion_stool_status_terrace_${tenantSlug}`,
  ]
  for (const k of keys) {
    try {
      window.localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i)
      if (!k) continue
      if (k.startsWith(`vysion_tables_`) && k.includes(tenantSlug)) {
        window.localStorage.removeItem(k)
      }
      if (k.startsWith('vysion_kassa_bar_bon_watermark')) {
        window.localStorage.removeItem(k)
      }
    }
  } catch {
    /* ignore */
  }
}
