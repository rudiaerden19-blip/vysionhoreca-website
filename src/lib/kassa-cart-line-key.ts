import type { KassaSelectedChoice } from '@/lib/kassa-cart-types'

/** Vrije tekst op mandregel — trim; leeg wordt genegeerd (merge-gedrag zoals vóór notities). */
export function normalizeKassaLineNote(note?: string | null): string | undefined {
  const trimmed = (note ?? '').trim()
  return trimmed.length > 0 ? trimmed : undefined
}

type ChoiceKey = Pick<KassaSelectedChoice, 'choiceId'>

/**
 * Unieke mandregel-sleutel: product + keuzes + optionele opmerking.
 * Zonder opmerking blijft de key gelijk aan het oude formaat (achterwaarts compatibel).
 */
export function buildKassaCartLineKey(
  productId: string,
  choices: ChoiceKey[] = [],
  lineNote?: string | null,
): string {
  const pid = String(productId)
  const choicePart =
    choices.length > 0
      ? `-${choices.map((c) => String(c.choiceId)).sort().join('-')}`
      : ''
  const note = normalizeKassaLineNote(lineNote)
  const notePart = note
    ? `-n-${encodeURIComponent(note).replace(/%/g, '_')}`
    : ''
  return `${pid}${choicePart}${notePart}`
}

/** Order-/keuken-JSON gebruikt `notes`, mand gebruikt `lineNote`. */
export function kassaCartLineOrderNotes(line: {
  lineNote?: string | null
  notes?: string | null
}): string | undefined {
  return normalizeKassaLineNote(line.lineNote) ?? normalizeKassaLineNote(line.notes)
}

export type KassaCartLineReceiptNoteSource = {
  lineNote?: string | null
  notes?: string | null
  lineNoteAsReceiptName?: boolean | null
  /** Opgeslagen in order.items JSON na afrekenen. */
  receipt_heading_name?: boolean | null
}

function kassaCartLineIsReceiptHeadingName(item: KassaCartLineReceiptNoteSource): boolean {
  return item.lineNoteAsReceiptName === true || item.receipt_heading_name === true
}

/** Alleen regels met vinkje «naam op bon» — niet gewone keukenopmerkingen. */
export function kassaDistinctCartLineNotesForReceipt(items: KassaCartLineReceiptNoteSource[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    if (!kassaCartLineIsReceiptHeadingName(item)) continue
    const note = kassaCartLineOrderNotes(item)
    if (!note) continue
    const key = note.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(note)
  }
  return out
}

/** Opmerking onder productregel op kassabon (niet als bon-header). */
export function kassaCartLineNoteOnProductReceipt(
  line: KassaCartLineReceiptNoteSource,
): string | undefined {
  if (kassaCartLineIsReceiptHeadingName(line)) return undefined
  return kassaCartLineOrderNotes(line)
}
