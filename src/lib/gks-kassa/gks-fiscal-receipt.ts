import type { KassaReceiptVatLine } from '@/lib/kassa-cart-types'
import type { GksFdmRef, GksSignResult, GksVatCalcItem } from '@/lib/gks-kassa/fdm-types'

/** Fiscale snapshot na signSale (N) — bron voor bon, niet computeInclusiveVatSplitFromCart. */
export type GksFiscalReceiptSnapshot = {
  posFiscalTicketNo: number
  posDateTime: string
  shortSignature?: string
  verificationUrl?: string
  fdmRef: GksFdmRef
  fdmSwVersion: string
  footer: string[]
  vatCalc: GksVatCalcItem[]
  digitalSignature?: string
}

export function gksFiscalSnapshotFromSignResult(result: GksSignResult): GksFiscalReceiptSnapshot {
  return {
    posFiscalTicketNo: result.posFiscalTicketNo,
    posDateTime: result.posDateTime,
    shortSignature: result.shortSignature,
    verificationUrl: result.verificationUrl,
    fdmRef: result.fdmRef,
    fdmSwVersion: result.fdmSwVersion,
    footer: result.footer ?? [],
    vatCalc: result.vatCalc ?? [],
    digitalSignature: result.digitalSignature,
  }
}

export function gksVatSplitFromFdmVatCalc(
  vatCalc: GksVatCalcItem[] | undefined,
  grossTotal: number,
): {
  byRate: KassaReceiptVatLine[]
  subtotalExcl: number
  totalTax: number
  grossTotal: number
} | null {
  if (!vatCalc?.length) return null
  const byRate: KassaReceiptVatLine[] = []
  let totalTax = 0
  let baseSum = 0
  for (const row of vatCalc) {
    if (row.outOfScope) continue
    const tax = Math.round((row.vatAmount || 0) * 100) / 100
    const baseExcl = Math.round((row.taxableAmount || 0) * 100) / 100
    totalTax += tax
    baseSum += baseExcl
    byRate.push({ rate: row.rate, baseExcl, tax })
  }
  totalTax = Math.round(totalTax * 100) / 100
  const subtotalExcl = Math.round(baseSum * 100) / 100
  return {
    byRate,
    subtotalExcl,
    totalTax,
    grossTotal: Math.round(grossTotal * 100) / 100,
  }
}

export type GksReceiptFiscalLabels = {
  fiscalTicketHeader: string
  proFormaBanner: string
  notValidFiscalTicket: string
  shortSignature: string
  eventCounter: string
  verifyAt: string
}

export function appendGksFiscalPaidReceiptLines(
  bonLines: string[],
  fiscal: GksFiscalReceiptSnapshot,
  labels: GksReceiptFiscalLabels,
): void {
  bonLines.push('--------------------------------')
  bonLines.push(
    `${labels.eventCounter} ${fiscal.fdmRef.eventLabel}-${fiscal.fdmRef.eventCounter} / ${fiscal.fdmRef.totalCounter}`,
  )
  if (fiscal.shortSignature) {
    bonLines.push(`${labels.shortSignature} ${fiscal.shortSignature}`)
  }
  if (fiscal.verificationUrl) {
    bonLines.push(`${labels.verifyAt}`)
    bonLines.push(fiscal.verificationUrl)
  }
  for (const line of fiscal.footer) {
    if (line.trim()) bonLines.push(line)
  }
}

export function appendGksProFormaDraftLines(
  bonLines: string[],
  labels: Pick<GksReceiptFiscalLabels, 'proFormaBanner' | 'notValidFiscalTicket'>,
): void {
  bonLines.push(labels.proFormaBanner)
  bonLines.push(labels.notValidFiscalTicket)
}

export function prependGksFiscalTicketHeader(bonLines: string[], header: string): void {
  const idx = bonLines.findIndex((l) => l.startsWith('---'))
  if (idx >= 0) {
    bonLines.splice(idx, 0, header, '================================')
  } else {
    bonLines.unshift('================================', header)
  }
}
