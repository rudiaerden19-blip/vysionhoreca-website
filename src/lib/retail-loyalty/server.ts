import { getServerSupabaseClient } from '@/lib/supabase-server'
import { generateRetailLoyaltyCardCode, normalizeRetailLoyaltyCardCode } from '@/lib/retail-loyalty/card-code'
import {
  computeRetailLoyaltyRedeemEuroDiscount,
  maxRetailLoyaltyRedeemPoints,
} from '@/lib/retail-loyalty/redeem-math'
import type { RetailLoyaltyMemberPublic, RetailLoyaltySettings } from '@/lib/retail-loyalty/types'

const SETTINGS_SELECT =
  'tenant_slug, enabled, points_per_euro, min_order_total_for_points, redeem_enabled, redeem_points_per_euro'
const MEMBER_SELECT = 'id, tenant_slug, card_code, display_name, phone, points_balance, is_active'

export async function getRetailLoyaltySettings(tenantSlug: string): Promise<RetailLoyaltySettings> {
  const supabase = getServerSupabaseClient()
  const fallback: RetailLoyaltySettings = {
    tenant_slug: tenantSlug,
    enabled: true,
    points_per_euro: 1,
    min_order_total_for_points: 0,
    redeem_enabled: true,
    redeem_points_per_euro: 100,
  }
  if (!supabase) return fallback

  const { data } = await supabase
    .from('retail_loyalty_settings')
    .select(SETTINGS_SELECT)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (!data) return fallback

  return {
    tenant_slug: tenantSlug,
    enabled: !!data.enabled,
    points_per_euro: Number(data.points_per_euro) || 0,
    min_order_total_for_points: Number(data.min_order_total_for_points) || 0,
    redeem_enabled: data.redeem_enabled !== false,
    redeem_points_per_euro: Number(data.redeem_points_per_euro) || 100,
  }
}

export async function upsertRetailLoyaltySettings(
  tenantSlug: string,
  patch: Partial<
    Pick<
      RetailLoyaltySettings,
      | 'enabled'
      | 'points_per_euro'
      | 'min_order_total_for_points'
      | 'redeem_enabled'
      | 'redeem_points_per_euro'
    >
  >,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const row: Record<string, unknown> = {
    tenant_slug: tenantSlug,
    updated_at: new Date().toISOString(),
  }
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  if (patch.points_per_euro !== undefined) row.points_per_euro = patch.points_per_euro
  if (patch.min_order_total_for_points !== undefined) {
    row.min_order_total_for_points = patch.min_order_total_for_points
  }
  if (patch.redeem_enabled !== undefined) row.redeem_enabled = patch.redeem_enabled
  if (patch.redeem_points_per_euro !== undefined) {
    row.redeem_points_per_euro = patch.redeem_points_per_euro
  }

  const { error } = await supabase.from('retail_loyalty_settings').upsert(row, {
    onConflict: 'tenant_slug',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function lookupRetailLoyaltyMemberByScan(
  tenantSlug: string,
  rawCode: string,
): Promise<RetailLoyaltyMemberPublic | null> {
  const cardCode = normalizeRetailLoyaltyCardCode(rawCode)
  if (!cardCode) return null

  const supabase = getServerSupabaseClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('retail_loyalty_members')
    .select(MEMBER_SELECT)
    .eq('tenant_slug', tenantSlug)
    .eq('card_code', cardCode)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    card_code: data.card_code,
    display_name: data.display_name,
    phone: data.phone,
    points_balance: Number(data.points_balance) || 0,
  }
}

export async function createRetailLoyaltyMember(
  tenantSlug: string,
  input: { display_name?: string; phone?: string; card_code?: string },
): Promise<{ ok: boolean; member?: RetailLoyaltyMemberPublic; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  let cardCode = input.card_code ? normalizeRetailLoyaltyCardCode(input.card_code) : null
  if (!cardCode) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateRetailLoyaltyCardCode()
      const { data: existing } = await supabase
        .from('retail_loyalty_members')
        .select('id')
        .eq('tenant_slug', tenantSlug)
        .eq('card_code', candidate)
        .maybeSingle()
      if (!existing) {
        cardCode = candidate
        break
      }
    }
  }
  if (!cardCode) return { ok: false, error: 'card_generate_failed' }

  const { data, error } = await supabase
    .from('retail_loyalty_members')
    .insert({
      tenant_slug: tenantSlug,
      card_code: cardCode,
      display_name: input.display_name?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select(MEMBER_SELECT)
    .single()

  if (error || !data) return { ok: false, error: error?.message || 'insert_failed' }

  return {
    ok: true,
    member: {
      id: data.id,
      card_code: data.card_code,
      display_name: data.display_name,
      phone: data.phone,
      points_balance: 0,
    },
  }
}

export function computeRetailLoyaltyPoints(
  settings: RetailLoyaltySettings,
  orderTotal: number,
): number {
  if (!settings.enabled) return 0
  const total = Math.round(orderTotal * 100) / 100
  if (total < settings.min_order_total_for_points) return 0
  const rate = Number(settings.points_per_euro)
  if (!(rate > 0)) return 0
  return Math.max(0, Math.floor(total * rate))
}

export async function earnRetailLoyaltyPointsForSale(
  tenantSlug: string,
  memberId: string,
  orderTotal: number,
  orderNumber?: number,
): Promise<{ ok: boolean; points?: number; balance?: number; error?: string }> {
  const settings = await getRetailLoyaltySettings(tenantSlug)
  const points = computeRetailLoyaltyPoints(settings, orderTotal)
  if (points <= 0) return { ok: true, points: 0 }

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const { data: member, error: loadErr } = await supabase
    .from('retail_loyalty_members')
    .select('id, points_balance, is_active')
    .eq('tenant_slug', tenantSlug)
    .eq('id', memberId)
    .maybeSingle()

  if (loadErr || !member || !member.is_active) {
    return { ok: false, error: 'member_not_found' }
  }

  const prev = Number(member.points_balance) || 0
  const next = prev + points

  const { error: updErr } = await supabase
    .from('retail_loyalty_members')
    .update({ points_balance: next, updated_at: new Date().toISOString() })
    .eq('tenant_slug', tenantSlug)
    .eq('id', memberId)

  if (updErr) return { ok: false, error: updErr.message }

  const { error: ledErr } = await supabase.from('retail_loyalty_ledger').insert({
    tenant_slug: tenantSlug,
    member_id: memberId,
    points_delta: points,
    reason: 'sale',
    order_number: orderNumber ?? null,
    order_total: Math.round(orderTotal * 100) / 100,
  })

  if (ledErr) {
    await supabase
      .from('retail_loyalty_members')
      .update({ points_balance: prev, updated_at: new Date().toISOString() })
      .eq('tenant_slug', tenantSlug)
      .eq('id', memberId)
    return { ok: false, error: ledErr.message }
  }

  return { ok: true, points, balance: next }
}

async function applyRetailLoyaltyPointsDelta(
  tenantSlug: string,
  memberId: string,
  pointsDelta: number,
  ledger: {
    reason: string
    order_number?: number | null
    order_total?: number | null
    note?: string | null
  },
): Promise<{ ok: boolean; balance?: number; error?: string }> {
  if (pointsDelta === 0) {
    const supabase = getServerSupabaseClient()
    if (!supabase) return { ok: false, error: 'db_unavailable' }
    const { data: member } = await supabase
      .from('retail_loyalty_members')
      .select('points_balance')
      .eq('tenant_slug', tenantSlug)
      .eq('id', memberId)
      .maybeSingle()
    return { ok: true, balance: Number(member?.points_balance) || 0 }
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const { data: member, error: loadErr } = await supabase
    .from('retail_loyalty_members')
    .select('id, points_balance, is_active')
    .eq('tenant_slug', tenantSlug)
    .eq('id', memberId)
    .maybeSingle()

  if (loadErr || !member || !member.is_active) {
    return { ok: false, error: 'member_not_found' }
  }

  const prev = Number(member.points_balance) || 0
  const next = prev + pointsDelta
  if (next < 0) return { ok: false, error: 'insufficient_points' }

  const { error: updErr } = await supabase
    .from('retail_loyalty_members')
    .update({ points_balance: next, updated_at: new Date().toISOString() })
    .eq('tenant_slug', tenantSlug)
    .eq('id', memberId)

  if (updErr) return { ok: false, error: updErr.message }

  const { error: ledErr } = await supabase.from('retail_loyalty_ledger').insert({
    tenant_slug: tenantSlug,
    member_id: memberId,
    points_delta: pointsDelta,
    reason: ledger.reason,
    order_number: ledger.order_number ?? null,
    order_total: ledger.order_total ?? null,
    note: ledger.note ?? null,
  })

  if (ledErr) {
    await supabase
      .from('retail_loyalty_members')
      .update({ points_balance: prev, updated_at: new Date().toISOString() })
      .eq('tenant_slug', tenantSlug)
      .eq('id', memberId)
    return { ok: false, error: ledErr.message }
  }

  return { ok: true, balance: next }
}

export async function updateRetailLoyaltyMember(
  tenantSlug: string,
  memberId: string,
  patch: { display_name?: string | null; phone?: string | null; is_active?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.display_name !== undefined) {
    row.display_name = patch.display_name?.trim() || null
  }
  if (patch.phone !== undefined) {
    row.phone = patch.phone?.trim() || null
  }
  if (patch.is_active !== undefined) row.is_active = patch.is_active

  const { error } = await supabase
    .from('retail_loyalty_members')
    .update(row)
    .eq('tenant_slug', tenantSlug)
    .eq('id', memberId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function adjustRetailLoyaltyMemberPoints(
  tenantSlug: string,
  memberId: string,
  pointsDelta: number,
  note?: string,
): Promise<{ ok: boolean; balance?: number; error?: string }> {
  if (!Number.isInteger(pointsDelta) || pointsDelta === 0) {
    return { ok: false, error: 'invalid_delta' }
  }
  return applyRetailLoyaltyPointsDelta(tenantSlug, memberId, pointsDelta, {
    reason: 'adjust',
    note: note?.trim() || null,
  })
}

export async function settleRetailLoyaltyForSale(
  tenantSlug: string,
  memberId: string,
  orderTotal: number,
  options?: { orderNumber?: number; redeemPoints?: number },
): Promise<{
  ok: boolean
  redeemed?: number
  earned?: number
  balance?: number
  error?: string
}> {
  const settings = await getRetailLoyaltySettings(tenantSlug)
  const redeemPoints = Math.max(0, Math.floor(options?.redeemPoints ?? 0))
  const paidTotal = Math.round(orderTotal * 100) / 100

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const { data: memberRow } = await supabase
    .from('retail_loyalty_members')
    .select('id, points_balance, is_active')
    .eq('tenant_slug', tenantSlug)
    .eq('id', memberId)
    .maybeSingle()

  if (!memberRow || !memberRow.is_active) return { ok: false, error: 'member_not_found' }

  const memberBalance = Number(memberRow.points_balance) || 0

  if (redeemPoints > 0) {
    if (!settings.redeem_enabled) return { ok: false, error: 'redeem_disabled' }
    const rate = Number(settings.redeem_points_per_euro)
    if (!(rate > 0)) return { ok: false, error: 'redeem_not_configured' }
    const discount = computeRetailLoyaltyRedeemEuroDiscount(redeemPoints, rate)
    if (discount <= 0) return { ok: false, error: 'invalid_redeem' }
    const grossBeforeDiscount = paidTotal + discount
    const maxPts = maxRetailLoyaltyRedeemPoints(memberBalance, grossBeforeDiscount, rate)
    if (redeemPoints > maxPts) return { ok: false, error: 'redeem_exceeds_order' }
  }

  let balance: number | undefined

  if (redeemPoints > 0) {
    const redeemRes = await applyRetailLoyaltyPointsDelta(tenantSlug, memberId, -redeemPoints, {
      reason: 'redeem',
      order_number: options?.orderNumber ?? null,
      order_total: paidTotal,
    })
    if (!redeemRes.ok) return { ok: false, error: redeemRes.error }
    balance = redeemRes.balance
  }

  const earned = computeRetailLoyaltyPoints(settings, paidTotal)
  if (earned > 0) {
    const earnRes = await applyRetailLoyaltyPointsDelta(tenantSlug, memberId, earned, {
      reason: 'sale',
      order_number: options?.orderNumber ?? null,
      order_total: paidTotal,
    })
    if (!earnRes.ok) {
      if (redeemPoints > 0) {
        await applyRetailLoyaltyPointsDelta(tenantSlug, memberId, redeemPoints, {
          reason: 'redeem_rollback',
          order_number: options?.orderNumber ?? null,
          note: 'earn_failed',
        })
      }
      return { ok: false, error: earnRes.error }
    }
    balance = earnRes.balance
  }

  if (balance === undefined) {
    balance = memberBalance
  }

  return {
    ok: true,
    redeemed: redeemPoints > 0 ? redeemPoints : 0,
    earned: earned > 0 ? earned : 0,
    balance,
  }
}

export { computeRetailLoyaltyRedeemEuroDiscount, maxRetailLoyaltyRedeemPoints }
