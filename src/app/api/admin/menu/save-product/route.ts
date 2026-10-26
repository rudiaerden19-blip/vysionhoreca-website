/**
 * Eén POST: menu_product opslaan + optioneel optie-koppelingen (horeca).
 * Voorkomt 3× /api/admin/db vanuit de producten-modal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { recordAudit, auditRequestMeta, type AuditActorType } from '@/lib/audit-log'
import { logger } from '@/lib/logger'
import type { MenuProduct } from '@/lib/admin-api-menu-product-helpers'
import {
  persistMenuProductOnServer,
  syncProductOptionLinksOnServer,
} from '@/lib/menu-product-server-persist'

const MenuProductSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_slug: z.string().min(1),
    category_id: z.string().uuid().nullable(),
    name: z.string().min(1).max(500),
    description: z.string().max(8000).optional().default(''),
    price: z.number().finite().min(0),
    image_url: z.string().max(8000).optional().default(''),
    is_active: z.boolean(),
    is_popular: z.boolean().optional().default(false),
    is_promo: z.boolean().optional(),
    promo_price: z.number().finite().min(0).optional(),
    sort_order: z.number().int().min(0).max(999999),
    allergens: z.array(z.string()).optional().default([]),
    image_display_mode: z.enum(['cover', 'contain']).nullable().optional(),
    print_label: z.boolean().optional(),
    kassa_image_zoom: z.number().nullable().optional(),
    track_stock: z.boolean().optional(),
    stock_quantity: z.number().optional(),
    low_stock_threshold: z.number().optional(),
    article_number: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    size_label: z.string().nullable().optional(),
    color_label: z.string().nullable().optional(),
    catalog_mode: z.enum(['horeca', 'retail']).nullable().optional(),
    retail_sale_unit: z.enum(['stuk', 'doos', 'bak', 'pallet']).nullable().optional(),
    retail_unit_quantity: z.number().nullable().optional(),
    retail_promo_buy: z.number().nullable().optional(),
    retail_promo_free: z.number().nullable().optional(),
    retail_promo_from: z.string().nullable().optional(),
    retail_promo_until: z.string().nullable().optional(),
    retail_promo_partner_id: z.string().uuid().nullable().optional(),
  })
  .passthrough()

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  product: MenuProductSchema,
  /** Horeca: koppel opties; retail: weglaten of syncOptionLinks false */
  optionIds: z.array(z.string().uuid()).max(200).optional(),
  syncOptionLinks: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ongeldige aanvraag', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { tenantSlug, product: productInput, optionIds, syncOptionLinks } = parsed.data
    if (productInput.tenant_slug !== tenantSlug) {
      return NextResponse.json({ error: 'Tenant mismatch' }, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    const product = productInput as MenuProduct
    const { data: saved, error: saveErr } = await persistMenuProductOnServer(supabase, product)
    if (!saved?.id) {
      return NextResponse.json({ error: saveErr || 'Opslaan mislukt' }, { status: 400 })
    }

    const shouldSync = syncOptionLinks === true
    if (shouldSync) {
      const links = await syncProductOptionLinksOnServer(
        supabase,
        tenantSlug,
        saved.id,
        optionIds ?? [],
      )
      if (!links.ok) {
        return NextResponse.json(
          { error: links.error || 'Opties koppelen mislukt', product: saved },
          { status: 400 },
        )
      }
    }

    const actorType: AuditActorType = access.isSuperAdmin ? 'superadmin' : 'owner'
    const actorEmail = req.headers.get('x-auth-email') || req.headers.get('x-superadmin-email')
    const actorId = req.headers.get('x-business-id') || req.headers.get('x-superadmin-id')
    const meta = auditRequestMeta(req)

    await recordAudit(supabase, {
      tenantSlug,
      actorType,
      actorId: actorId || null,
      actorEmail: actorEmail || null,
      action: product.id ? 'update' : 'insert',
      resourceType: 'menu_products',
      resourceId: saved.id,
      before: null,
      after: { id: saved.id, name: saved.name, syncOptionLinks: shouldSync },
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId,
      notes: 'save-product',
    })

    return NextResponse.json({ ok: true, product: saved }, { status: 200 })
  } catch (e: unknown) {
    logger.warn('[save-product] uncaught', {
      requestId,
      err: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
