/**
 * Één POST voor alle categorie-wijzigingen (volgorde, naam, zichtbaarheid).
 * Voorkomt N × /api/admin/db (rate-limit, audit-storm, lang hangende UI).
 * Alleen UPDATE op bestaande rijen — geen INSERT → geen dubbele categorieën.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { recordAudit, auditRequestMeta, type AuditActorType } from '@/lib/audit-log'
import { logger } from '@/lib/logger'

const CategoryRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).max(999999),
  is_active: z.boolean(),
})

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  categories: z.array(CategoryRowSchema).min(1).max(5000),
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

    const { tenantSlug, categories } = parsed.data

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    const actorType: AuditActorType = access.isSuperAdmin ? 'superadmin' : 'owner'
    const actorEmail = req.headers.get('x-auth-email') || req.headers.get('x-superadmin-email')
    const actorId = req.headers.get('x-business-id') || req.headers.get('x-superadmin-id')
    const meta = auditRequestMeta(req)

    for (const cat of categories) {
      const patch = {
        name: cat.name,
        description: cat.description ?? '',
        sort_order: cat.sort_order,
        is_active: cat.is_active,
      }

      const { data: updated, error } = await supabase
        .from('menu_categories')
        .update(patch)
        .eq('id', cat.id)
        .eq('tenant_slug', tenantSlug)
        .select('id')
        .maybeSingle()

      if (error) {
        logger.warn('[bulk-save-categories] update failed', {
          requestId,
          id: cat.id,
          err: error.message,
        })
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (!updated) {
        return NextResponse.json(
          { error: `Categorie niet gevonden voor deze zaak (id: ${cat.id.slice(0, 8)}…)` },
          { status: 404 },
        )
      }
    }

    await recordAudit(supabase, {
      tenantSlug,
      actorType,
      actorId: actorId || null,
      actorEmail: actorEmail || null,
      action: 'batch_update',
      resourceType: 'menu_categories',
      resourceId: null,
      before: null,
      after: { count: categories.length },
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId,
      notes: 'bulk-save-categories',
    })

    return NextResponse.json({ ok: true, updated: categories.length }, { status: 200 })
  } catch (e: unknown) {
    logger.warn('[bulk-save-categories] uncaught', {
      requestId,
      err: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
