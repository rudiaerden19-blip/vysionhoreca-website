import { getServerSupabaseClient } from '@/lib/supabase-server'
import { generateRetailLoyaltyCardCode, normalizeRetailLoyaltyCardCode } from '@/lib/retail-loyalty/card-code'
import {
  computeRetailLoyaltyRedeemEuroDiscount,
  maxRetailLoyaltyRedeemPoints,
} from '@/lib/retail-loyalty/redeem-math'
import { sendRetailLoyaltyPassEmail } from '@/lib/retail-loyalty/send-pass-email'
import type { RetailLoyaltyMemberPos, RetailLoyaltyMemberPublic, RetailLoyaltySettings } from '@/lib/retail-loyalty/types'
import bcrypt from 'bcryptjs'

const SETTINGS_SELECT =
  'tenant_slug, enabled, points_per_euro, min_order_total_for_points, redeem_enabled, redeem_points_per_euro'
const MEMBER_SELECT =
  'id, tenant_slug, card_code, display_name, phone, email, shop_customer_id, points_balance, is_active'

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

async function resolveRetailLoyaltyMemberEmail(
  supabase: NonNullable<ReturnType<typeof getServerSupabaseClient>>,
  tenantSlug: string,
  member: { email?: string | null; shop_customer_id?: string | null },
): Promise<string | null> {
  const direct = member.email?.trim().toLowerCase() || ''
  if (direct.includes('@')) return direct
  const customerId = member.shop_customer_id
  if (!customerId) return null
  const { data: cust } = await supabase
    .from('shop_customers')
    .select('email')
    .eq('tenant_slug', tenantSlug)
    .eq('id', customerId)
    .maybeSingle()
  const fromCustomer = cust?.email?.trim().toLowerCase() || ''
  return fromCustomer.includes('@') ? fromCustomer : null
}

export async function lookupRetailLoyaltyMemberByScan(
  tenantSlug: string,
  rawCode: string,
): Promise<RetailLoyaltyMemberPublic | null> {
  const pos = await lookupRetailLoyaltyMemberForKassaPos(tenantSlug, rawCode)
  if (!pos) return null
  const { email: _e, ...pub } = pos
  return pub
}

export async function lookupRetailLoyaltyMemberForKassaPos(
  tenantSlug: string,
  rawCode: string,
): Promise<RetailLoyaltyMemberPos | null> {
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

  const email = await resolveRetailLoyaltyMemberEmail(supabase, tenantSlug, data)

  return {
    id: data.id,
    card_code: data.card_code,
    display_name: data.display_name,
    phone: data.phone,
    points_balance: Number(data.points_balance) || 0,
    email,
  }
}

export type RetailLoyaltyShopCustomerHit = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  postal_code: string | null
  city: string | null
}

export type RetailLoyaltyCustomerSearchHit = {
  customer: RetailLoyaltyShopCustomerHit
  loyaltyMember: RetailLoyaltyMemberPublic | null
}

export async function searchRetailLoyaltyCustomers(
  tenantSlug: string,
  rawQuery: string,
): Promise<{ ok: boolean; results: RetailLoyaltyCustomerSearchHit[]; error?: string }> {
  const q = rawQuery.trim()
  if (q.length < 2) return { ok: true, results: [] }

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, results: [], error: 'db_unavailable' }

  const safe = q.replace(/[%_\\]/g, '')
  const emailExact = q.includes('@') ? q.toLowerCase().trim() : null

  let customerQuery = supabase
    .from('shop_customers')
    .select('id, name, email, phone, address, postal_code, city')
    .eq('tenant_slug', tenantSlug)
    .limit(12)

  if (emailExact) {
    customerQuery = customerQuery.ilike('email', emailExact)
  } else {
    const quoted = `"${safe.replace(/"/g, '')}"`
    customerQuery = customerQuery.or(
      `name.ilike.${quoted},email.ilike.${quoted},phone.ilike.${quoted}`,
    )
  }

  const { data: customers, error } = await customerQuery
  if (error) return { ok: false, results: [], error: error.message }

  const hits: RetailLoyaltyCustomerSearchHit[] = []
  for (const row of customers ?? []) {
    const customer: RetailLoyaltyShopCustomerHit = {
      id: row.id,
      name: row.name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? null,
      address: row.address ?? null,
      postal_code: row.postal_code ?? null,
      city: row.city ?? null,
    }
    let loyaltyMember: RetailLoyaltyMemberPublic | null = null

    const { data: byLink } = await supabase
      .from('retail_loyalty_members')
      .select(MEMBER_SELECT)
      .eq('tenant_slug', tenantSlug)
      .eq('shop_customer_id', customer.id)
      .eq('is_active', true)
      .maybeSingle()

    if (byLink) {
      loyaltyMember = {
        id: byLink.id,
        card_code: byLink.card_code,
        display_name: byLink.display_name,
        phone: byLink.phone,
        points_balance: Number(byLink.points_balance) || 0,
      }
    } else if (customer.phone?.trim()) {
      const phone = customer.phone.trim()
      const { data: byPhone } = await supabase
        .from('retail_loyalty_members')
        .select(MEMBER_SELECT)
        .eq('tenant_slug', tenantSlug)
        .eq('phone', phone)
        .eq('is_active', true)
        .maybeSingle()
      if (byPhone) {
        loyaltyMember = {
          id: byPhone.id,
          card_code: byPhone.card_code,
          display_name: byPhone.display_name,
          phone: byPhone.phone,
          points_balance: Number(byPhone.points_balance) || 0,
        }
      }
    }

    hits.push({ customer, loyaltyMember })
  }

  return { ok: true, results: hits }
}

async function upsertShopCustomerForLoyalty(
  tenantSlug: string,
  input: {
    shop_customer_id?: string
    name: string
    email: string
    phone?: string
    address?: string
  },
): Promise<{ ok: boolean; customerId?: string; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!email || !email.includes('@')) return { ok: false, error: 'email_required' }
  if (!name) return { ok: false, error: 'name_required' }

  const patch = {
    name,
    email,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (input.shop_customer_id) {
    const { error } = await supabase
      .from('shop_customers')
      .update(patch)
      .eq('tenant_slug', tenantSlug)
      .eq('id', input.shop_customer_id)
    if (error) return { ok: false, error: error.message }
    return { ok: true, customerId: input.shop_customer_id }
  }

  const { data: existing } = await supabase
    .from('shop_customers')
    .select('id')
    .eq('tenant_slug', tenantSlug)
    .eq('email', email)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('shop_customers')
      .update(patch)
      .eq('tenant_slug', tenantSlug)
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true, customerId: existing.id }
  }

  const randomPass = crypto.randomUUID() + crypto.randomUUID()
  const password_hash = await bcrypt.hash(randomPass, 12)

  const { data: inserted, error: insErr } = await supabase
    .from('shop_customers')
    .insert({
      tenant_slug: tenantSlug,
      ...patch,
      password_hash,
      loyalty_points: 0,
      total_spent: 0,
      total_orders: 0,
      is_active: true,
      email_verified: false,
    })
    .select('id')
    .single()

  if (insErr || !inserted) return { ok: false, error: insErr?.message || 'customer_insert_failed' }
  return { ok: true, customerId: inserted.id }
}

export async function createRetailLoyaltyMember(
  tenantSlug: string,
  input: {
    display_name?: string
    phone?: string
    email?: string
    address?: string
    shop_customer_id?: string
    card_code?: string
    sendPassEmail?: boolean
    emailOrigin?: string
    resendExistingPass?: boolean
  },
): Promise<{ ok: boolean; member?: RetailLoyaltyMemberPublic; error?: string; emailSent?: boolean }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  let shopCustomerId = input.shop_customer_id
  const emailNorm = input.email?.trim().toLowerCase()

  if (emailNorm && input.display_name?.trim()) {
    const custRes = await upsertShopCustomerForLoyalty(tenantSlug, {
      shop_customer_id: shopCustomerId,
      name: input.display_name.trim(),
      email: emailNorm,
      phone: input.phone,
      address: input.address,
    })
    if (!custRes.ok) return { ok: false, error: custRes.error }
    shopCustomerId = custRes.customerId
  }

  if (shopCustomerId) {
    const { data: existingPass } = await supabase
      .from('retail_loyalty_members')
      .select(MEMBER_SELECT)
      .eq('tenant_slug', tenantSlug)
      .eq('shop_customer_id', shopCustomerId)
      .eq('is_active', true)
      .maybeSingle()
    if (existingPass) {
      if (!input.resendExistingPass) {
        let emailSent = false
        if (input.sendPassEmail && emailNorm) {
          const mail = await sendRetailLoyaltyPassEmail({
            supabase,
            tenantSlug,
            toEmail: emailNorm,
            cardCode: existingPass.card_code,
            displayName: existingPass.display_name,
            origin: input.emailOrigin || '',
          })
          emailSent = mail.ok
          if (!mail.ok && mail.error === 'smtp_not_configured') {
            return { ok: false, error: 'smtp_not_configured' }
          }
          if (mail.ok) {
            const member: RetailLoyaltyMemberPublic = {
              id: existingPass.id,
              card_code: existingPass.card_code,
              display_name: existingPass.display_name,
              phone: existingPass.phone,
              points_balance: Number(existingPass.points_balance) || 0,
            }
            return { ok: true, member, emailSent: true, error: 'existing_pass_mailed' }
          }
          const member: RetailLoyaltyMemberPublic = {
            id: existingPass.id,
            card_code: existingPass.card_code,
            display_name: existingPass.display_name,
            phone: existingPass.phone,
            points_balance: Number(existingPass.points_balance) || 0,
          }
          return { ok: true, member, emailSent: false, error: 'email_send_failed' }
        }
        return { ok: false, error: 'email_has_active_pass' }
      }
      await updateRetailLoyaltyMember(tenantSlug, existingPass.id, {
        display_name: input.display_name?.trim() || existingPass.display_name,
        phone: input.phone?.trim() || existingPass.phone,
        email: emailNorm || null,
      })
      const member: RetailLoyaltyMemberPublic = {
        id: existingPass.id,
        card_code: existingPass.card_code,
        display_name: input.display_name?.trim() || existingPass.display_name,
        phone: input.phone?.trim() || existingPass.phone,
        points_balance: Number(existingPass.points_balance) || 0,
      }
      let emailSent = false
      if (input.sendPassEmail && emailNorm) {
        const mail = await sendRetailLoyaltyPassEmail({
          supabase,
          tenantSlug,
          toEmail: emailNorm,
          cardCode: existingPass.card_code,
          displayName: existingPass.display_name,
          origin: input.emailOrigin || '',
        })
        emailSent = mail.ok
        if (!mail.ok && mail.error === 'smtp_not_configured') {
          return { ok: true, member, emailSent: false, error: 'smtp_not_configured' }
        }
        if (!mail.ok) {
          return { ok: true, member, emailSent: false, error: 'email_send_failed' }
        }
      }
      return { ok: true, member, emailSent }
    }
  }

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
      email: emailNorm || null,
      shop_customer_id: shopCustomerId ?? null,
    })
    .select(MEMBER_SELECT)
    .single()

  if (error || !data) return { ok: false, error: error?.message || 'insert_failed' }

  const member: RetailLoyaltyMemberPublic = {
    id: data.id,
    card_code: data.card_code,
    display_name: data.display_name,
    phone: data.phone,
    points_balance: 0,
  }

  let emailSent = false
  if (input.sendPassEmail && emailNorm) {
    const mail = await sendRetailLoyaltyPassEmail({
      supabase,
      tenantSlug,
      toEmail: emailNorm,
      cardCode: data.card_code,
      displayName: data.display_name,
      origin: input.emailOrigin || '',
    })
    emailSent = mail.ok
    if (!mail.ok && mail.error === 'smtp_not_configured') {
      return { ok: true, member, emailSent: false, error: 'smtp_not_configured' }
    }
    if (!mail.ok) return { ok: true, member, emailSent: false, error: 'email_send_failed' }
  }

  return { ok: true, member, emailSent }
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
  patch: { display_name?: string | null; phone?: string | null; email?: string | null; is_active?: boolean },
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
  if (patch.email !== undefined) {
    row.email = patch.email?.trim().toLowerCase() || null
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

export async function deleteRetailLoyaltyMember(
  tenantSlug: string,
  memberId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const { error } = await supabase
    .from('retail_loyalty_members')
    .delete()
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
