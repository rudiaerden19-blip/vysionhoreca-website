import {
  kassaCartLineNoteOnProductReceipt,
  kassaCartLineOrderNotes,
  type KassaCartLineReceiptNoteSource,
} from '@/lib/kassa-cart-line-key'
import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { VysionPrintAgentItem } from '@/lib/vysion-print-agent-client'

/** Minstens één regel met mand-opmerking (numpad, productopties, …). */
export function kassaCartHasPrintableLineAnnotations(
  items: KassaCartLineReceiptNoteSource[],
): boolean {
  return items.some((line) => kassaCartLineOrderNotes(line) != null)
}

/**
 * Kassabon: rijke `orderData` negeert `bonInhoud` in oudere Print Agents → zonder opmerkingen.
 * Zodra er regelopmerkingen zijn: alleen `bonInhoud` (volledige tekst uit de kassa).
 * Keukenbon: altijd `orderData` met `notes` per item (agent ondersteunt dat al).
 */
export function kassaReceiptOmitPrintAgentOrderData(
  receiptMode: 'kassa' | 'keuken',
  items: KassaCartLineReceiptNoteSource[],
): boolean {
  return receiptMode === 'kassa' && kassaCartHasPrintableLineAnnotations(items)
}

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
