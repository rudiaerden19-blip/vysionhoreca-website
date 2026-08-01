/**
 * BTW-catalogus voor kassabon — server-side (service role), expliciet default_btw_percentage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
    }
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
    }
    const { tenantSlug } = parsed.data

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    const [{ data: categories, error: catErr }, { data: products, error: prodErr }] =
      await Promise.all([
        supabase
          .from('menu_categories')
          .select('id, tenant_slug, name, default_btw_percentage, is_active, sort_order')
          .eq('tenant_slug', tenantSlug),
        supabase
          .from('menu_products')
          .select('id, tenant_slug, category_id, name, price, is_active, sort_order')
          .eq('tenant_slug', tenantSlug),
      ])

    if (catErr) {
      return NextResponse.json({ error: catErr.message }, { status: 400 })
    }
    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      categories: categories ?? [],
      products: products ?? [],
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
