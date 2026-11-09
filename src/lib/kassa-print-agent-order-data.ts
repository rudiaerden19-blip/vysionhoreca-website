import {
  kassaCartLineNoteOnProductReceipt,
  kassaCartLineOrderNotes,
  kassaDistinctCartLineNotesForReceipt,
  type KassaCartLineReceiptNoteSource,
} from '@/lib/kassa-cart-line-key'
import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { VysionPrintAgentItem } from '@/lib/vysion-print-agent-client'

export function buildKassaPrintAgentOrderItem(
  line: KassaCartItem,
  receiptMode: 'kassa' | 'keuken',
): VysionPrintAgentItem {
  const choicesTotal = (line.choices || []).reduce((s, c) => s + c.price, 0)
  const item: VysionPrintAgentItem = {
    quantity: line.quantity,
    name: line.product.name,
    price: (line.product.price + choicesTotal) * line.quantity,
    choices: (line.choices || []).map((c) => ({ name: c.choiceName, price: c.price })),
  }
  const note =
    receiptMode === 'keuken'
      ? kassaCartLineOrderNotes(line)
      : kassaCartLineNoteOnProductReceipt(line)
  if (note) item.notes = note
  return item
}

/** Namen bovenaan kassabon (niet bij keuken — daar staan alle notes op de regel). */
export function buildKassaPrintAgentReceiptHeadingNames(
  lines: KassaCartLineReceiptNoteSource[],
  receiptMode: 'kassa' | 'keuken',
): string[] | undefined {
  if (receiptMode !== 'kassa') return undefined
  const names = kassaDistinctCartLineNotesForReceipt(lines)
  return names.length > 0 ? names : undefined
}
