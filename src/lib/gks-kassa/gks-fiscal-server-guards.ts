/**
 * Server-only: DevTools kan client lock omzeilen; fiscale writes worden hier afgedwongen.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const FdmSuccessBaseSchema = z
  .object({
    eventOperation: z.string().min(1),
    fdmRef: z
      .object({
        eventCounter: z.union([z.number(), z.string()]),
        totalCounter: z.union([z.number(), z.string()]).optional(),
      })
      .passthrough(),
    posFiscalTicketNo: z.union([z.number(), z.string()]),
    shortSignature: z.string().min(1).optional(),
    verificationUrl: z.string().url().optional(),
  })
  .passthrough()

export function validateGksFdmMarkSuccessPayload(
  responsePayload: Record<string, unknown>,
): { ok: true } | { ok: false; error: string } {
  const parsed = FdmSuccessBaseSchema.safeParse(responsePayload)
  if (!parsed.success) {
    return { ok: false, error: 'response_payload_geen_geldig_fdm_signresult' }
  }
  const op = String(parsed.data.eventOperation).toUpperCase()
  const allowed =
    op === 'SALE' ||
    op === 'ORDER' ||
    op === 'PRE_BILL' ||
    op.includes('REPORT') ||
    op.includes('TURNOVER')
  if (!allowed) {
    return { ok: false, error: 'response_payload_event_operation_ongeldig' }
  }
  if (op === 'SALE') {
    if (!parsed.data.shortSignature?.trim() || !parsed.data.verificationUrl?.trim()) {
      return { ok: false, error: 'response_payload_sale_vereist_handtekening_en_qr' }
    }
  }
  return { ok: true }
}

function isPaidFiscalCommercialRow(row: Record<string, unknown>): boolean {
  const ps = String(row.payment_status || '').toLowerCase()
  if (ps !== 'paid') return false
  const st = String(row.status || '').toLowerCase()
  return st !== 'open'
}

export async function assertGksFiscalJournalAllowsPaidInsert(
  supabase: SupabaseClient,
  tenantSlug: string,
  fiscalJournalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('fiscal_journal')
    .select('id, status, event_label, mutation, tenant_slug')
    .eq('tenant_slug', tenantSlug)
    .eq('id', fiscalJournalId)
    .maybeSingle()
  if (error) {
    return { ok: false, error: error.message }
  }
  if (!data) {
    return { ok: false, error: 'fiscal_journal_niet_gevonden' }
  }
  if (data.status !== 'PENDING' && data.status !== 'SENT') {
    return { ok: false, error: 'fiscal_journal_niet_in_pending_voor_betaalde_insert' }
  }
  if (data.event_label !== 'N' || data.mutation !== 'signSale') {
    return { ok: false, error: 'fiscal_journal_geen_signsale_n' }
  }
  return { ok: true }
}

export async function enforcePaidCommercialInsertGuard(
  supabase: SupabaseClient,
  tenantSlug: string,
  row: Record<string, unknown>,
  fiscalJournalId: string | undefined,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isPaidFiscalCommercialRow(row)) {
    return { ok: true }
  }
  if (!fiscalJournalId) {
    return {
      ok: false,
      error: 'Betaalde GKS-order vereist fiscalJournalId (server guard).',
      status: 403,
    }
  }
  const journal = await assertGksFiscalJournalAllowsPaidInsert(supabase, tenantSlug, fiscalJournalId)
  if (!journal.ok) {
    return { ok: false, error: journal.error, status: 403 }
  }
  return { ok: true }
}
