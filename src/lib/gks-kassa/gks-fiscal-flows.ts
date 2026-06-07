'use client'

import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'
import { cartLinesToTransaction } from '@/lib/gks-kassa/cart-to-transaction'
import { cashRoundingDelta, roundCashToFiveCents } from '@/lib/gks-kassa/cash-rounding'
import { clearCostCenterReference, getOrCreateCostCenterReference } from '@/lib/gks-kassa/cost-center-session'
import type { GksPaymentLineInput } from '@/lib/gks-kassa/fdm-types'
import { assertGksStaffForFiscal, type GksActiveStaff } from '@/lib/gks-kassa/gks-staff'
import { assertGksCanFiscalize, gksAvailabilityToFlowError } from '@/lib/gks-kassa/gks-availability'
import { getGksInternetOnline } from '@/lib/gks-kassa/gks-internet-lock'
import { signOrder, signSale, type GksPartnerContext } from '@/services/gksPartnerService'
import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'
import { tableOrderMapKey } from '@/lib/kassa-floor-plan-zone'
import {
  GKS_PILOT_DEVICE_ID,
  GKS_PILOT_EST_NO,
  GKS_PILOT_POS_ID,
  GKS_PILOT_POS_SW_VERSION,
  GKS_PILOT_TERMINAL_ID,
} from '@/lib/gks-kassa/pilot-config'
import { getBookingDateBrussels, getOrCreateBookingPeriodId } from '@/lib/gks-kassa/booking-period'
import type { GksPosEnvelope, GksSignResult } from '@/lib/gks-kassa/fdm-types'
import {
  gksFiscalSnapshotFromSignResult,
  type GksFiscalReceiptSnapshot,
} from '@/lib/gks-kassa/gks-fiscal-receipt'
import {
  gksFiscalJournalCreatePending,
  gksFiscalJournalMarkFailed,
  gksFiscalJournalMarkSuccess,
} from '@/lib/gks-kassa/fiscal-journal-api'

export type GksFiscalFlowError = { code: string; message: string }

/** Altijd RFC-4122 UUID (API fiscal_journal vereist .uuid()). */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const POS_TICKET_LS_KEY = (tenant: string) =>
  `gks_pos_fiscal_ticket_no_${tenant}_${GKS_PILOT_TERMINAL_ID}`

/** Volgende ticketnr zoals signSale/buildEnvelope (zonder localStorage te verhogen). */
function peekNextPosFiscalTicketNo(tenantSlug: string): number {
  if (typeof window === 'undefined') return 1
  try {
    const raw = localStorage.getItem(POS_TICKET_LS_KEY(tenantSlug))
    const prev = raw ? parseInt(raw, 10) : 0
    return prev >= 999999999 ? 1 : prev + 1
  } catch {
    return 1
  }
}

function brusselsPosDateTime(): string {
  const d = new Date()
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const offset =
    new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Brussels' })).getTime() -
      new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime() >=
    3600000
      ? '+02:00'
      : '+01:00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offset}`
}

function buildPendingEnvelope(ctx: GksPartnerContext): GksPosEnvelope {
  return {
    language: ctx.language ?? 'NL',
    ticketMedium: ctx.ticketMedium ?? 'PAPER',
    posId: GKS_PILOT_POS_ID,
    posFiscalTicketNo: peekNextPosFiscalTicketNo(ctx.tenantSlug),
    posSwVersion: GKS_PILOT_POS_SW_VERSION,
    terminalId: GKS_PILOT_TERMINAL_ID,
    deviceId: GKS_PILOT_DEVICE_ID,
    posDateTime: brusselsPosDateTime(),
    bookingPeriodId: getOrCreateBookingPeriodId(ctx.tenantSlug),
    bookingDate: getBookingDateBrussels(),
    vatNo: ctx.vatNo,
    estNo: GKS_PILOT_EST_NO,
    employeeId: ctx.employeeId,
  }
}

function signResultToResponsePayload(result: GksSignResult): Record<string, unknown> {
  return {
    posId: result.posId,
    posFiscalTicketNo: result.posFiscalTicketNo,
    posDateTime: result.posDateTime,
    terminalId: result.terminalId,
    deviceId: result.deviceId,
    eventOperation: result.eventOperation,
    fdmRef: result.fdmRef,
    fdmSwVersion: result.fdmSwVersion,
    shortSignature: result.shortSignature,
    verificationUrl: result.verificationUrl,
    vatCalc: result.vatCalc,
    digitalSignature: result.digitalSignature,
  }
}

async function markJournalFailedSafe(
  tenantSlug: string,
  journalId: string,
  code: string,
  message: string,
  detail?: unknown,
): Promise<void> {
  try {
    await gksFiscalJournalMarkFailed(tenantSlug, journalId, {
      error: code,
      message,
      detail: detail != null ? String(detail) : undefined,
    })
  } catch {
    /* best-effort */
  }
}

function partnerCtx(
  tenantSlug: string,
  staff: GksActiveStaff,
  vatNo: string,
): GksPartnerContext {
  return {
    tenantSlug,
    employeeId: staff.insz,
    vatNo: vatNo.startsWith('BE') ? vatNo : `BE${vatNo.replace(/\D/g, '').padStart(10, '0').slice(-10)}`,
  }
}

function paymentLinesForSale(
  method: KassaPaymentMethod,
  total: number,
  split?: { cash: number; card: number },
): GksPaymentLineInput[] {
  if (method === 'SPLIT' && split) {
    const lines: GksPaymentLineInput[] = []
    if (split.card > 0) {
      lines.push({
        id: 'card',
        name: 'Card',
        type: 'CARD_DEBIT',
        inputMethod: 'MANUAL',
        amount: Math.round(split.card * 100) / 100,
        amountType: 'PAYMENT',
      })
    }
    if (split.cash > 0) {
      const raw = split.cash
      const rounded = roundCashToFiveCents(raw)
      lines.push({
        id: 'cash',
        name: 'Cash',
        type: 'CASH',
        inputMethod: 'MANUAL',
        amount: rounded,
        amountType: 'PAYMENT',
      })
      const delta = cashRoundingDelta(raw, rounded)
      if (Math.abs(delta) >= 0.01) {
        lines.push({
          id: 'cash-round',
          name: 'Cash',
          type: 'CASH',
          inputMethod: 'MANUAL',
          amount: delta,
          amountType: 'ROUNDING',
        })
      }
    }
    return lines
  }
  if (method === 'CASH') {
    const rounded = roundCashToFiveCents(total)
    const lines: GksPaymentLineInput[] = [
      {
        id: 'cash',
        name: 'Cash',
        type: 'CASH',
        inputMethod: 'MANUAL',
        amount: rounded,
        amountType: 'PAYMENT',
      },
    ]
    const delta = cashRoundingDelta(total, rounded)
    if (Math.abs(delta) >= 0.01) {
      lines.push({
        id: 'cash-round',
        name: 'Cash',
        type: 'CASH',
        inputMethod: 'MANUAL',
        amount: delta,
        amountType: 'ROUNDING',
      })
    }
    return lines
  }
  return [
    {
      id: 'card',
      name: 'Card',
      type: method === 'CARD' ? 'CARD_DEBIT' : 'OTHER',
      inputMethod: 'MANUAL',
      amount: Math.round(total * 100) / 100,
      amountType: 'PAYMENT',
    },
  ]
}

export async function gksEnsureFdmReady(
  tenantSlug: string,
  staff: GksActiveStaff | null,
  vatNo: string,
): Promise<GksFiscalFlowError | null> {
  if (!getGksInternetOnline()) {
    const err = gksAvailabilityToFlowError({
      status: 'INTERNET_OFFLINE',
      checkedAt: Date.now(),
    })
    return { code: err.code, message: err.message }
  }
  if (!assertGksStaffForFiscal(staff)) {
    return { code: 'STAFF_REQUIRED', message: 'Medewerker met geldig INSZ vereist.' }
  }
  return assertGksCanFiscalize({ tenantSlug, staff, vatNo })
}

export async function gksPersistTableOrderP(
  tenantSlug: string,
  staff: GksActiveStaff | null,
  vatNo: string,
  zone: FloorPlanZone,
  tableNr: string,
  items: KassaCartItem[],
  resolveVatPercent: (line: KassaCartItem) => number,
  opts?: { commercialOrderId?: string | null },
): Promise<GksFiscalFlowError | null> {
  if (items.length === 0) return null
  const gate = await gksEnsureFdmReady(tenantSlug, staff, vatNo)
  if (gate) return gate
  const ctx = partnerCtx(tenantSlug, staff!, vatNo)
  const slotKey = tableOrderMapKey(zone, tableNr)
  const reference = getOrCreateCostCenterReference(tenantSlug, slotKey)
  const costCenter = { id: tableNr, type: 'TABLE' as const, reference }
  const transaction = cartLinesToTransaction(items, resolveVatPercent)

  const envelope = buildPendingEnvelope(ctx)
  const idempotencyKey = newIdempotencyKey()
  const commercialOrderId = opts?.commercialOrderId?.trim() || undefined

  const pendingRes = await gksFiscalJournalCreatePending({
    tenantSlug,
    eventLabel: 'P',
    mutation: 'signOrder',
    idempotencyKey,
    posId: envelope.posId,
    terminalId: envelope.terminalId,
    deviceId: envelope.deviceId,
    posFiscalTicketNo: envelope.posFiscalTicketNo,
    posDateTime: envelope.posDateTime,
    bookingPeriodId: envelope.bookingPeriodId,
    bookingDate: envelope.bookingDate,
    employeeId: envelope.employeeId,
    requestPayload: { costCenter, transaction, envelope },
    ...(commercialOrderId ? { commercialOrderId } : {}),
  })
  if (!pendingRes.ok) {
    return {
      code: 'FISCAL_JOURNAL_PENDING',
      message: pendingRes.error || 'Kon fiscaal journal (P) niet starten.',
    }
  }
  const journalId = pendingRes.data.id

  let result: GksSignResult
  try {
    result = await signOrder(ctx, costCenter, transaction)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'signOrder mislukt'
    await markJournalFailedSafe(tenantSlug, journalId, 'SIGN_ORDER_FAILED', message)
    return { code: 'SIGN_ORDER_FAILED', message }
  }

  const successRes = await gksFiscalJournalMarkSuccess(
    tenantSlug,
    journalId,
    signResultToResponsePayload(result),
    commercialOrderId,
  )
  if (!successRes.ok || successRes.data.status !== 'SUCCESS') {
    await markJournalFailedSafe(
      tenantSlug,
      journalId,
      'MARK_SUCCESS_FAILED',
      successRes.ok ? `status=${successRes.data.status}` : successRes.error,
    )
    return {
      code: 'MARK_SUCCESS_FAILED',
      message: successRes.ok
        ? 'Fiscaal journal (P) kon niet op SUCCESS gezet worden.'
        : successRes.error || 'mark_success mislukt',
    }
  }
  return null
}

export async function gksCompleteSaleN(
  tenantSlug: string,
  staff: GksActiveStaff | null,
  vatNo: string,
  billLines: KassaCartItem[],
  total: number,
  method: KassaPaymentMethod,
  resolveVatPercent: (line: KassaCartItem) => number,
  opts?: {
    zone?: FloorPlanZone
    tableNumber?: string
    splitAmounts?: { cash: number; card: number }
    /** Na signSale, vóór mark_success — koppel gks_commercial_orders.id aan journal. */
    resolveCommercialOrderId?: (ctx: {
      posFiscalTicketNo: number
      journalId: string
    }) => Promise<string | null | undefined>
  },
): Promise<
  | {
      ok: true
      posFiscalTicketNo: number
      shortSignature?: string
      journalId: string
      fiscalSnapshot: GksFiscalReceiptSnapshot
    }
  | { ok: false; error: GksFiscalFlowError }
> {
  const gate = await gksEnsureFdmReady(tenantSlug, staff, vatNo)
  if (gate) return { ok: false, error: gate }
  const ctx = partnerCtx(tenantSlug, staff!, vatNo)
  const transaction = cartLinesToTransaction(billLines, resolveVatPercent)
  const financials = paymentLinesForSale(method, total, opts?.splitAmounts)
  let costCenter: { id: string; type: 'TABLE'; reference: string } | undefined
  if (opts?.tableNumber && opts.zone) {
    const slotKey = tableOrderMapKey(opts.zone, opts.tableNumber)
    costCenter = {
      id: opts.tableNumber,
      type: 'TABLE',
      reference: getOrCreateCostCenterReference(tenantSlug, slotKey),
    }
  }

  const envelope = buildPendingEnvelope(ctx)
  const idempotencyKey = newIdempotencyKey()

  const pendingRes = await gksFiscalJournalCreatePending({
    tenantSlug,
    eventLabel: 'N',
    mutation: 'signSale',
    idempotencyKey,
    posId: envelope.posId,
    terminalId: envelope.terminalId,
    deviceId: envelope.deviceId,
    posFiscalTicketNo: envelope.posFiscalTicketNo,
    posDateTime: envelope.posDateTime,
    bookingPeriodId: envelope.bookingPeriodId,
    bookingDate: envelope.bookingDate,
    employeeId: envelope.employeeId,
    requestPayload: {
      costCenter,
      transaction,
      financials,
      envelope,
    },
  })
  if (!pendingRes.ok) {
    return {
      ok: false,
      error: {
        code: 'FISCAL_JOURNAL_PENDING',
        message: pendingRes.error || 'Kon fiscaal journal niet starten.',
      },
    }
  }
  const journalId = pendingRes.data.id

  let result: GksSignResult
  try {
    result = await signSale(ctx, transaction, financials, costCenter)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'signSale mislukt'
    await markJournalFailedSafe(tenantSlug, journalId, 'SIGN_SALE_FAILED', message)
    return { ok: false, error: { code: 'SIGN_SALE_FAILED', message } }
  }

  let commercialOrderId: string | undefined
  if (opts?.resolveCommercialOrderId) {
    try {
      const linked = await opts.resolveCommercialOrderId({
        posFiscalTicketNo: result.posFiscalTicketNo,
        journalId,
      })
      if (linked) commercialOrderId = linked
    } catch (err: unknown) {
      console.warn('[gks-kassa] resolveCommercialOrderId failed', err)
    }
  }

  const successRes = await gksFiscalJournalMarkSuccess(
    tenantSlug,
    journalId,
    signResultToResponsePayload(result),
    commercialOrderId,
  )
  if (!successRes.ok || successRes.data.status !== 'SUCCESS') {
    await markJournalFailedSafe(
      tenantSlug,
      journalId,
      'MARK_SUCCESS_FAILED',
      successRes.ok ? `status=${successRes.data.status}` : successRes.error,
    )
    return {
      ok: false,
      error: {
        code: 'MARK_SUCCESS_FAILED',
        message: successRes.ok
          ? 'Fiscaal journal kon niet op SUCCESS gezet worden.'
          : successRes.error || 'mark_success mislukt',
      },
    }
  }

  if (opts?.zone && opts?.tableNumber) {
    clearCostCenterReference(tenantSlug, tableOrderMapKey(opts.zone, opts.tableNumber))
  }
  return {
    ok: true,
    posFiscalTicketNo: result.posFiscalTicketNo,
    shortSignature: result.shortSignature,
    journalId,
    fiscalSnapshot: gksFiscalSnapshotFromSignResult(result),
  }
}
