'use client'

import { authFetch } from '@/lib/auth-headers'

type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number }

async function postFiscalJournal<T>(body: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const res = await authFetch('/api/gks-kassa/fiscal-journal', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    let json: { data?: T; error?: string } | null = null
    try {
      json = await res.json()
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}`, status: res.status }
    }
    if (!json?.data) {
      return { ok: false, error: 'Geen data in antwoord', status: res.status }
    }
    return { ok: true, data: json.data, status: res.status }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'network'
    return { ok: false, error: msg, status: 0 }
  }
}

export type GksFiscalJournalPendingRow = {
  id: string
  status: string
  idempotency_key: string
  commercial_order_id?: string | null
}

export type GksFiscalJournalStatusRow = {
  id: string
  status: string
}

export type GksCreatePendingInput = {
  tenantSlug: string
  eventLabel: 'N' | 'P' | 'T' | 'C' | 'F' | 'S' | 'I' | 'R'
  mutation: string
  idempotencyKey: string
  posId: string
  terminalId: string
  deviceId: string
  posFiscalTicketNo: number
  posDateTime: string
  bookingPeriodId: string
  bookingDate: string
  employeeId: string
  requestPayload: Record<string, unknown>
}

export async function gksFiscalJournalCreatePending(
  input: GksCreatePendingInput,
): Promise<ApiResult<GksFiscalJournalPendingRow>> {
  return postFiscalJournal<GksFiscalJournalPendingRow>({
    op: 'create_pending',
    ...input,
  })
}

export async function gksFiscalJournalMarkSuccess(
  tenantSlug: string,
  journalId: string,
  responsePayload: Record<string, unknown>,
  commercialOrderId?: string | null,
): Promise<ApiResult<GksFiscalJournalStatusRow>> {
  return postFiscalJournal<GksFiscalJournalStatusRow>({
    op: 'mark_success',
    tenantSlug,
    journalId,
    responsePayload,
    ...(commercialOrderId ? { commercialOrderId } : {}),
  })
}

export async function gksFiscalJournalMarkFailed(
  tenantSlug: string,
  journalId: string,
  errorPayload: Record<string, unknown>,
): Promise<ApiResult<GksFiscalJournalStatusRow>> {
  return postFiscalJournal<GksFiscalJournalStatusRow>({
    op: 'mark_failed',
    tenantSlug,
    journalId,
    errorPayload,
  })
}
