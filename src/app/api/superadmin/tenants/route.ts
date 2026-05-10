/**
 * Superadmin tenant operations — server-side, service-role.
 *
 * POST  /api/superadmin/tenants
 * Body  { action: 'create', tenant: {...} }
 *       { action: 'delete', slug: string, tenantSettingsId?: string }
 *       { action: 'block',  slug: string, isBlocked: boolean, tenantSettingsId?: string }
 *
 * Auth: x-superadmin-id + x-superadmin-email headers, geverifieerd via super_admins tabel.
 *
 * Rationale: deze tabellen (business_profiles, tenants, super_admins, subscriptions)
 * zijn te gevoelig om via de generieke /api/admin/db proxy te muteren. We willen
 * één gecontroleerde plek met cascade-logic voor tenant-deletion.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { recordAudit, auditRequestMeta } from '@/lib/audit-log'
import { logger } from '@/lib/logger'
import { ensureDeliverySettingsForTenant } from '@/lib/tenant-defaults'
import { DEFAULT_ENABLED_ALLERGEN_IDS } from '@/lib/allergens-defaults'
import {
  isProtectedTenant,
  getProtectionError,
} from '@/lib/protected-tenants'
import {
  isMissingPostTrialModulesColumnError,
  withoutPostTrialModulesConfirmed,
} from '@/lib/supabase-post-trial-column'

const CreateSchema = z.object({
  action: z.literal('create'),
  tenant: z.object({
    tenant_slug: z.string().min(1),
    business_name: z.string().min(1),
    email: z.string().email().or(z.literal('')).optional(),
    phone: z.string().optional(),
  }),
})

const DeleteSchema = z.object({
  action: z.literal('delete'),
  slug: z.string().min(1),
  tenantSettingsId: z.string().optional(),
})

const BlockSchema = z.object({
  action: z.literal('block'),
  slug: z.string().min(1),
  isBlocked: z.boolean(),
  tenantSettingsId: z.string().min(1),
})

const SaveSubscriptionSchema = z.object({
  action: z.literal('save_subscription'),
  slug: z.string().min(1),
  subscriptionId: z.string().optional(),
  data: z.record(z.any()),
  tenantPlan: z.string().optional(),
})

const ActivateSubscriptionSchema = z.object({
  action: z.literal('activate_subscription'),
  slug: z.string().min(1),
  subscriptionId: z.string().optional(),
})

const CancelSubscriptionSchema = z.object({
  action: z.literal('cancel_subscription'),
  subscriptionId: z.string().min(1),
  slug: z.string().min(1),
})

const UpdateModulesSchema = z.object({
  action: z.literal('update_modules'),
  slug: z.string().min(1),
  enabledModules: z.record(z.boolean()).nullable(),
  postTrialConfirmed: z.boolean().optional(),
})

const BodySchema = z.discriminatedUnion('action', [
  CreateSchema,
  DeleteSchema,
  BlockSchema,
  SaveSubscriptionSchema,
  ActivateSubscriptionSchema,
  CancelSubscriptionSchema,
  UpdateModulesSchema,
])

const CASCADE_DELETE_TABLES = [
  'order_items',
  'orders',
  'reviews',
  'shop_customers',
  'loyalty_rewards',
  'loyalty_redemptions',
  'promotions',
  'qr_codes',
  'menu_products',
  'menu_categories',
  'product_options',
  'product_option_choices',
  'product_option_links',
  'tenant_media',
  'tenant_texts',
  'delivery_settings',
  'opening_hours',
  'reservations',
  'gift_cards',
  'team_members',
  'staff_clock_sessions',
  'staff',
  'timesheet_entries',
  'monthly_timesheets',
  'daily_sales',
  'fixed_costs',
  'variable_costs',
  'business_targets',
  'tenant_kasboek_manual_lines',
  'z_reports',
  'subscriptions',
  'guest_profiles',
  'tenant_order_sequences',
  'pin_settings',
  'whatsapp_settings',
  'whatsapp_messages',
  'tenant_settings',
  'tenants',
  'business_profiles',
] as const

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  const access = await verifySuperAdminAccess(req)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Niet ingelogd als superadmin' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige aanvraag', issues: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
  }

  const meta = auditRequestMeta(req)
  const actorEmail = req.headers.get('x-superadmin-email')
  const actorId = req.headers.get('x-superadmin-id')

  try {
    // ── CREATE ─────────────────────────────────────────────────────────
    if (body.action === 'create') {
      const slug = body.tenant.tenant_slug.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!slug) return NextResponse.json({ error: 'Ongeldige slug' }, { status: 400 })

      // 1. tenants
      // Geen proefperiode meer — superadmin maakt zaak direct 'active' aan;
      // betalingscontrole loopt via de blokkeer-knop op `tenants.is_blocked`.
      const tenantInsert = {
        name: body.tenant.business_name,
        slug,
        email: body.tenant.email || '',
        phone: body.tenant.phone || '',
        plan: 'starter',
        subscription_status: 'active',
        trial_ends_at: null as string | null,
        enabled_modules: null as null,
        post_trial_modules_confirmed: true,
        feature_group_orders: true,
      }
      let { error: tenantsError } = await supabase.from('tenants').insert(tenantInsert)
      if (tenantsError && isMissingPostTrialModulesColumnError(tenantsError)) {
        ;({ error: tenantsError } = await supabase
          .from('tenants')
          .insert(withoutPostTrialModulesConfirmed(tenantInsert as Record<string, unknown>)))
      }
      if (tenantsError) {
        logger.warn('[superadmin/tenants] tenants insert failed', { requestId, slug, err: tenantsError.message })
        // niet hard falen, sommige installaties hebben deze tabel niet
      }

      // 2. business_profiles (voor login) — alleen als email opgegeven
      if (body.tenant.email) {
        const { error: profileError } = await supabase
          .from('business_profiles')
          .insert({
            name: body.tenant.business_name,
            email: body.tenant.email,
            password_hash: 'RESET_REQUIRED',
            phone: body.tenant.phone || '',
            tenant_slug: slug,
          })
        if (profileError) {
          logger.warn('[superadmin/tenants] business_profiles insert failed', {
            requestId,
            slug,
            err: profileError.message,
          })
        }
      }

      // 3. tenant_settings
      let settingsError = (
        await supabase.from('tenant_settings').insert({
          tenant_slug: slug,
          business_name: body.tenant.business_name,
          email: body.tenant.email || '',
          phone: body.tenant.phone || '',
          primary_color: '#FF6B35',
          secondary_color: '#1a1a2e',
          allergens_config: DEFAULT_ENABLED_ALLERGEN_IDS,
        })
      ).error
      if (settingsError && /allergens_config|schema cache|PGRST204|column/i.test(settingsError.message)) {
        settingsError = (
          await supabase.from('tenant_settings').insert({
            tenant_slug: slug,
            business_name: body.tenant.business_name,
            email: body.tenant.email || '',
            phone: body.tenant.phone || '',
            primary_color: '#FF6B35',
            secondary_color: '#1a1a2e',
          })
        ).error
      }
      if (settingsError) {
        return NextResponse.json({ error: 'tenant_settings: ' + settingsError.message }, { status: 400 })
      }

      // 4. subscriptions
      await supabase.from('subscriptions').insert({
        tenant_slug: slug,
        plan: 'starter',
        status: 'active',
        price_monthly: 59,
        trial_started_at: null,
        trial_ends_at: null,
      })

      // 5. delivery_settings defaults
      await ensureDeliverySettingsForTenant(supabase, slug)

      // 6. Audit
      await recordAudit(supabase, {
        tenantSlug: slug,
        actorType: 'superadmin',
        actorId,
        actorEmail,
        action: 'create_tenant',
        resourceType: 'tenants',
        resourceId: slug,
        before: null,
        after: tenantInsert,
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId,
        notes: `Tenant aangemaakt door superadmin`,
      })

      return NextResponse.json({ ok: true, slug }, { status: 200 })
    }

    // ── DELETE ─────────────────────────────────────────────────────────
    if (body.action === 'delete') {
      if (isProtectedTenant(body.slug)) {
        return NextResponse.json({ error: getProtectionError(body.slug) }, { status: 403 })
      }
      const slug = body.slug

      const errors: string[] = []
      for (const table of CASCADE_DELETE_TABLES) {
        // Voor de meeste tabellen is de kolom `tenant_slug`. Voor `tenants` is het `slug`.
        const column = table === 'tenants' ? 'slug' : 'tenant_slug'
        const { error } = await supabase.from(table).delete().eq(column, slug)
        if (error) {
          // Niet hard falen — sommige tabellen bestaan misschien niet in elke installatie
          logger.warn('[superadmin/tenants] cascade-delete', { requestId, table, slug, err: error.message })
          if (!/does not exist|relation|schema cache/i.test(error.message)) {
            errors.push(`${table}: ${error.message}`)
          }
        }
      }

      await recordAudit(supabase, {
        tenantSlug: slug,
        actorType: 'superadmin',
        actorId,
        actorEmail,
        action: 'delete_tenant',
        resourceType: 'tenants',
        resourceId: slug,
        before: null,
        after: { errors },
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId,
        notes: errors.length > 0 ? `Tenant verwijderd met ${errors.length} fouten` : `Tenant volledig verwijderd`,
      })

      return NextResponse.json({ ok: true, errors }, { status: 200 })
    }

    // ── BLOCK / UNBLOCK ────────────────────────────────────────────────
    if (body.action === 'block') {
      const { error } = await supabase
        .from('tenant_settings')
        .update({ is_blocked: body.isBlocked })
        .eq('id', body.tenantSettingsId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await recordAudit(supabase, {
        tenantSlug: body.slug,
        actorType: 'superadmin',
        actorId,
        actorEmail,
        action: body.isBlocked ? 'block_tenant' : 'unblock_tenant',
        resourceType: 'tenant_settings',
        resourceId: body.tenantSettingsId,
        before: { is_blocked: !body.isBlocked },
        after: { is_blocked: body.isBlocked },
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId,
      })

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // ── SAVE SUBSCRIPTION ──────────────────────────────────────────────
    if (body.action === 'save_subscription') {
      const data = { ...body.data, tenant_slug: body.slug }
      // Forbid client-set id / created_at
      delete (data as any).id
      delete (data as any).created_at
      if (body.subscriptionId) {
        const { error } = await supabase.from('subscriptions').update(data).eq('id', body.subscriptionId)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      } else {
        const { error } = await supabase.from('subscriptions').insert(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (body.tenantPlan) {
        await supabase.from('tenants').update({ plan: body.tenantPlan }).eq('slug', body.slug)
      }
      await recordAudit(supabase, {
        tenantSlug: body.slug,
        actorType: 'superadmin',
        actorId, actorEmail,
        action: 'save_subscription',
        resourceType: 'subscriptions',
        resourceId: body.subscriptionId || null,
        before: null,
        after: data,
        ip: meta.ip, userAgent: meta.userAgent, requestId,
      })
      return NextResponse.json({ ok: true })
    }

    // ── ACTIVATE SUBSCRIPTION ──────────────────────────────────────────
    if (body.action === 'activate_subscription') {
      const now = new Date()
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const updates = {
        status: 'active',
        subscription_started_at: now.toISOString(),
        next_payment_at: nextMonth.toISOString(),
      }
      if (body.subscriptionId) {
        const { error } = await supabase.from('subscriptions').update(updates).eq('id', body.subscriptionId)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      } else {
        const { error } = await supabase.from('subscriptions').insert({
          tenant_slug: body.slug,
          plan: 'starter',
          price_monthly: 59,
          ...updates,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      }
      await recordAudit(supabase, {
        tenantSlug: body.slug,
        actorType: 'superadmin', actorId, actorEmail,
        action: 'activate_subscription',
        resourceType: 'subscriptions',
        resourceId: body.subscriptionId || null,
        before: null, after: updates,
        ip: meta.ip, userAgent: meta.userAgent, requestId,
      })
      return NextResponse.json({ ok: true })
    }

    // ── CANCEL SUBSCRIPTION ────────────────────────────────────────────
    if (body.action === 'cancel_subscription') {
      const updates = { status: 'cancelled', cancelled_at: new Date().toISOString() }
      const { error } = await supabase.from('subscriptions').update(updates).eq('id', body.subscriptionId)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await recordAudit(supabase, {
        tenantSlug: body.slug,
        actorType: 'superadmin', actorId, actorEmail,
        action: 'cancel_subscription',
        resourceType: 'subscriptions',
        resourceId: body.subscriptionId,
        before: null, after: updates,
        ip: meta.ip, userAgent: meta.userAgent, requestId,
      })
      return NextResponse.json({ ok: true })
    }

    // ── UPDATE MODULES ─────────────────────────────────────────────────
    if (body.action === 'update_modules') {
      const payload: Record<string, unknown> = {
        enabled_modules: body.enabledModules,
        post_trial_modules_confirmed: body.postTrialConfirmed ?? true,
      }
      let { error } = await supabase.from('tenants').update(payload).eq('slug', body.slug)
      if (error && isMissingPostTrialModulesColumnError(error)) {
        const fallback = withoutPostTrialModulesConfirmed(payload as Record<string, unknown>)
        ;({ error } = await supabase.from('tenants').update(fallback).eq('slug', body.slug))
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await recordAudit(supabase, {
        tenantSlug: body.slug,
        actorType: 'superadmin', actorId, actorEmail,
        action: 'update_modules',
        resourceType: 'tenants',
        resourceId: body.slug,
        before: null, after: payload,
        ip: meta.ip, userAgent: meta.userAgent, requestId,
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err: any) {
    logger.error('[superadmin/tenants] uncaught', { requestId, err: err?.message || String(err) })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
