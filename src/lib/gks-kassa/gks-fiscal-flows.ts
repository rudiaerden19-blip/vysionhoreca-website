'use client'

import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'
import { cartLinesToTransaction } from '@/lib/gks-kassa/cart-to-transaction'
import { cashRoundingDelta, roundCashToFiveCents } from '@/lib/gks-kassa/cash-rounding'
import { clearCostCenterReference, getOrCreateCostCenterReference } from '@/lib/gks-kassa/cost-center-session'
import type { GksPaymentLineInput } from '@/lib/gks-kassa/fdm-types'
import { assertGksStaffForFiscal, type GksActiveStaff } from '@/lib/gks-kassa/gks-staff'
import {
  queryFdmStatus,
  signOrder,
  signSale,
  type GksPartnerContext,
} from '@/services/gksPartnerService'
import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'
import { tableOrderMapKey } from '@/lib/kassa-floor-plan-zone'

export type GksFiscalFlowError = { code: string; message: string }

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
  if (!assertGksStaffForFiscal(staff)) {
    return { code: 'STAFF_REQUIRED', message: 'Medewerker met geldig INSZ vereist.' }
  }
  const status = await queryFdmStatus(partnerCtx(tenantSlug, staff, vatNo))
  if (!status.operational) {
    return { code: 'FDM_NOT_OPERATIONAL', message: status.messages.join('; ') || 'FDM niet operationeel' }
  }
  return null
}

export async function gksPersistTableOrderP(
  tenantSlug: string,
  staff: GksActiveStaff | null,
  vatNo: string,
  zone: FloorPlanZone,
  tableNr: string,
  items: KassaCartItem[],
  resolveVatPercent: (line: KassaCartItem) => number,
): Promise<GksFiscalFlowError | null> {
  if (items.length === 0) return null
  const gate = await gksEnsureFdmReady(tenantSlug, staff, vatNo)
  if (gate) return gate
  const slotKey = tableOrderMapKey(zone, tableNr)
  const reference = getOrCreateCostCenterReference(tenantSlug, slotKey)
  const transaction = cartLinesToTransaction(items, resolveVatPercent)
  await signOrder(partnerCtx(tenantSlug, staff!, vatNo), {
    id: tableNr,
    type: 'TABLE',
    reference,
  }, transaction)
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
  },
): Promise<{ ok: true; posFiscalTicketNo: number; shortSignature?: string } | { ok: false; error: GksFiscalFlowError }> {
  const gate = await gksEnsureFdmReady(tenantSlug, staff, vatNo)
  if (gate) return { ok: false, error: gate }
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
  const result = await signSale(
    partnerCtx(tenantSlug, staff!, vatNo),
    transaction,
    financials,
    costCenter,
  )
  if (opts?.zone && opts?.tableNumber) {
    clearCostCenterReference(tenantSlug, tableOrderMapKey(opts.zone, opts.tableNumber))
  }
  return {
    ok: true,
    posFiscalTicketNo: result.posFiscalTicketNo,
    shortSignature: result.shortSignature,
  }
}
