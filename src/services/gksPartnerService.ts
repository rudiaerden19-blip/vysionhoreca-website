/**
 * Checkbox FDM — stap 1 mock (GraphQL-structuur) tot SDK/tokens beschikbaar zijn.
 */

import {
  GKS_PILOT_DEVICE_ID,
  GKS_PILOT_EST_NO,
  GKS_PILOT_POS_ID,
  GKS_PILOT_POS_SW_VERSION,
  GKS_PILOT_TERMINAL_ID,
  isGksZReportPilotTenant,
} from '@/lib/gks-kassa/pilot-config'
import { appendFiscalJournalEntry } from '@/lib/gks-kassa/fiscal-journal'
import { nextPosFiscalTicketNo } from '@/lib/gks-kassa/pos-fiscal-counter'
import { getBookingDateBrussels, getOrCreateBookingPeriodId } from '@/lib/gks-kassa/booking-period'
import { mockVatCalcFromLines } from '@/lib/gks-kassa/vat-label'
import type {
  GksCostCenter,
  GksFdmStatus,
  GksLanguage,
  GksPaymentLineInput,
  GksPosEnvelope,
  GksSignResult,
  GksTicketMedium,
  GksTransactionInput,
  GksVatLabel,
} from '@/lib/gks-kassa/fdm-types'

export type GksPartnerMode = 'mock' | 'live'

export interface GksPartnerContext {
  tenantSlug: string
  employeeId: string
  vatNo: string
  language?: GksLanguage
  ticketMedium?: GksTicketMedium
}

const MOCK_FDM_ID = 'FOD01987654'

let mockEventCounter = 1000
let mockTotalCounter = 5000

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

function buildEnvelope(ctx: GksPartnerContext): GksPosEnvelope {
  return {
    language: ctx.language ?? 'NL',
    ticketMedium: ctx.ticketMedium ?? 'PAPER',
    posId: GKS_PILOT_POS_ID,
    posFiscalTicketNo: nextPosFiscalTicketNo(ctx.tenantSlug),
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

function mockSignResult(
  envelope: GksPosEnvelope,
  eventOperation: string,
  eventLabel: 'N' | 'P' | 'R',
  transaction?: GksTransactionInput,
): GksSignResult {
  mockEventCounter += 1
  mockTotalCounter += 1
  const vatLines =
    transaction?.transactionLines.flatMap((tl) =>
      tl.mainProduct.vats.map((v) => ({ label: v.label as GksVatLabel, gross: v.price })),
    ) ?? []
  const isSale = eventLabel === 'N'
  return {
    posId: envelope.posId,
    posFiscalTicketNo: envelope.posFiscalTicketNo,
    posDateTime: envelope.posDateTime,
    terminalId: envelope.terminalId,
    deviceId: envelope.deviceId,
    eventOperation,
    fdmRef: {
      fdmId: MOCK_FDM_ID,
      fdmDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      eventLabel,
      eventCounter: mockEventCounter,
      totalCounter: mockTotalCounter,
    },
    fdmSwVersion: '1.0.0-mock',
    digitalSignature: btoa(`mock-sig-${envelope.posFiscalTicketNo}-${Date.now()}`),
    shortSignature: isSale ? `M${mockEventCounter.toString(16).toUpperCase().slice(-8)}` : undefined,
    verificationUrl: isSale
      ? `https://mock.checkbox.gks/${MOCK_FDM_ID}${mockTotalCounter}`.slice(0, 38)
      : undefined,
    vatCalc: isSale && vatLines.length ? mockVatCalcFromLines(vatLines) : undefined,
    bufferCapacityUsed: 12.5,
    footer: [],
  }
}

async function postGraphQlMock(
  mutation: string,
  variables: Record<string, unknown>,
  ctx: GksPartnerContext,
): Promise<{ data?: Record<string, unknown>; errors?: { message: string }[] }> {
  const base = process.env.NEXT_PUBLIC_CHECKBOX_FDM_GRAPHQL_URL?.trim()
  if (!base) {
    return { data: { signResult: variables } }
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation, variables }),
    })
    return (await res.json()) as { data?: Record<string, unknown>; errors?: { message: string }[] }
  } catch (e) {
    return { errors: [{ message: e instanceof Error ? e.message : 'network' }] }
  }
}

export function partnerMode(): GksPartnerMode {
  return process.env.NEXT_PUBLIC_CHECKBOX_FDM_GRAPHQL_URL?.trim() ? 'live' : 'mock'
}

export async function queryFdmStatus(ctx: GksPartnerContext): Promise<GksFdmStatus> {
  const query = `query Status($language: Language!) { status(language: $language) { initialized device { fdmId fdmSwVersion bufferCapacityUsed } } }`
  const gql = await postGraphQlMock(query, { language: ctx.language ?? 'NL' }, ctx)
  const status: GksFdmStatus = {
    initialized: true,
    operational: !gql.errors?.length,
    fdmId: MOCK_FDM_ID,
    fdmSwVersion: '1.0.0-mock',
    bufferCapacityUsed: 12.5,
    messages: gql.errors?.map((e) => e.message) ?? [],
  }
  await appendFiscalJournalEntry(ctx.tenantSlug, {
    mutation: 'status',
    request: { query: 'status', language: ctx.language ?? 'NL' },
    response: status,
    mock: partnerMode() === 'mock',
  })
  return status
}

export async function signOrder(
  ctx: GksPartnerContext,
  costCenter: GksCostCenter,
  transaction: GksTransactionInput,
): Promise<GksSignResult> {
  const envelope = buildEnvelope(ctx)
  const request = { ...envelope, costCenter, transaction }
  const mutation = `mutation SignOrder($data: OrderInput!) { signOrder(data: $data) { posFiscalTicketNo fdmRef { eventCounter totalCounter } } }`
  const gql = await postGraphQlMock(mutation, { data: request }, ctx)
  if (gql.errors?.length) {
    throw new Error(gql.errors[0].message)
  }
  const result = mockSignResult(envelope, 'ORDER', 'P', transaction)
  await appendFiscalJournalEntry(ctx.tenantSlug, {
    mutation: 'signOrder',
    request,
    response: result,
    mock: partnerMode() === 'mock',
  })
  return result
}

export async function signPreBill(
  ctx: GksPartnerContext,
  costCenter: GksCostCenter | undefined,
  transaction: GksTransactionInput,
  financials?: GksPaymentLineInput[],
): Promise<GksSignResult> {
  const envelope = buildEnvelope(ctx)
  const request = { ...envelope, costCenter, transaction, financials: financials ?? [] }
  const mutation = `mutation SignPreBill($data: PreBillInput!) { signPreBill(data: $data) { posFiscalTicketNo } }`
  const gql = await postGraphQlMock(mutation, { data: request }, ctx)
  if (gql.errors?.length) throw new Error(gql.errors[0].message)
  const result = mockSignResult(envelope, 'PRE_BILL', 'P', transaction)
  await appendFiscalJournalEntry(ctx.tenantSlug, {
    mutation: 'signPreBill',
    request,
    response: result,
    mock: partnerMode() === 'mock',
  })
  return result
}

export async function signSale(
  ctx: GksPartnerContext,
  transaction: GksTransactionInput,
  financials: GksPaymentLineInput[],
  costCenter?: GksCostCenter,
): Promise<GksSignResult> {
  const status = await queryFdmStatus(ctx)
  if (!status.operational) {
    throw new Error('FDM_NOT_OPERATIONAL')
  }
  const envelope = buildEnvelope(ctx)
  const request = { ...envelope, costCenter, transaction, financials }
  const mutation = `mutation SignSale($data: SaleInput!) { signSale(data: $data) { shortSignature verificationUrl vatCalc { label taxableAmount vatAmount } } }`
  const gql = await postGraphQlMock(mutation, { data: request }, ctx)
  if (gql.errors?.length) throw new Error(gql.errors[0].message)
  const result = mockSignResult(envelope, 'SALE', 'N', transaction)
  await appendFiscalJournalEntry(ctx.tenantSlug, {
    mutation: 'signSale',
    request,
    response: result,
    mock: partnerMode() === 'mock',
  })
  return result
}

export async function signReportTurnoverZ(
  ctx: GksPartnerContext,
  reportPayload: Record<string, unknown>,
): Promise<GksSignResult | null> {
  if (!isGksZReportPilotTenant(ctx.tenantSlug)) {
    return null
  }
  const envelope = buildEnvelope(ctx)
  const request = { ...envelope, ...reportPayload }
  const mutation = `mutation SignZ($data: ReportTurnoverZInput!) { signReportTurnoverZ(data: $data) { fdmRef { eventCounter } } }`
  const gql = await postGraphQlMock(mutation, { data: request }, ctx)
  if (gql.errors?.length) throw new Error(gql.errors[0].message)
  const result = mockSignResult(envelope, 'REPORT_TURNOVER_Z', 'R')
  await appendFiscalJournalEntry(ctx.tenantSlug, {
    mutation: 'signReportTurnoverZ',
    request,
    response: result,
    mock: partnerMode() === 'mock',
  })
  return result
}
