/**
 * Audit log: schrijft elke admin-mutation naar `public.audit_log`.
 *
 * Roep ALTIJD vanuit de SERVER-SIDE aan met de service-role client. Nooit
 * direct vanuit de browser — daar zou een aanvaller logs kunnen vervalsen.
 *
 * De helper faalt SILENT (logt enkel naar Sentry/console). Een falende
 * audit mag een mutation niet blokkeren voor de klant.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { logger } from './logger'

export type AuditActorType = 'owner' | 'staff' | 'superadmin' | 'system' | 'anon'

export interface AuditEntry {
  tenantSlug: string
  actorType: AuditActorType
  actorId?: string | null
  actorEmail?: string | null

  action: string                 // 'insert' | 'update' | 'delete' | 'upsert' | custom
  resourceType: string           // tabel-naam of logical resource
  resourceId?: string | number | null

  before?: unknown
  after?: unknown

  ip?: string | null
  userAgent?: string | null
  requestId?: string | null
  notes?: string | null
}

/**
 * Schrijft één audit-entry. Faalt nooit hard.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    const row = {
      tenant_slug:   entry.tenantSlug,
      actor_type:    entry.actorType,
      actor_id:      entry.actorId ?? null,
      actor_email:   entry.actorEmail ?? null,
      action:        entry.action,
      resource_type: entry.resourceType,
      resource_id:   entry.resourceId == null ? null : String(entry.resourceId),
      before_data:   entry.before == null ? null : entry.before,
      after_data:    entry.after  == null ? null : entry.after,
      ip:            entry.ip ?? null,
      user_agent:    entry.userAgent ?? null,
      request_id:    entry.requestId ?? null,
      notes:         entry.notes ?? null,
    }
    const { error } = await supabase.from('audit_log').insert(row)
    if (error) {
      logger.warn('[audit] insert mislukt', { err: error.message, action: entry.action, resource: entry.resourceType })
    }
  } catch (e) {
    logger.warn('[audit] exception', { err: e instanceof Error ? e.message : String(e) })
  }
}

/**
 * Hulpje: extract IP / user-agent uit een NextRequest voor de audit-entry.
 */
export function auditRequestMeta(req: NextRequest): Pick<AuditEntry, 'ip' | 'userAgent'> {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null,
    userAgent: req.headers.get('user-agent') || null,
  }
}
