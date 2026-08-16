import type { KassaCartItem } from '@/lib/kassa-cart-types'
import { mergeCartLinesForTable } from '@/lib/kassa-table-cart-merge'

/** Verplaats geparkeerde tafelregels (open mand) naar een andere tafel-slot; karronde blijft ongemoeid. */
export function transferParkedTableOrder(
  orders: Record<string, KassaCartItem[]>,
  fromSlotKey: string,
  toSlotKey: string,
): { next: Record<string, KassaCartItem[]>; movedLineCount: number } | null {
  if (!fromSlotKey || !toSlotKey || fromSlotKey === toSlotKey) return null
  const fromLines = orders[fromSlotKey] ?? []
  if (fromLines.length === 0) return null
  const toLines = orders[toSlotKey] ?? []
  const merged = mergeCartLinesForTable(toLines, fromLines)
  const next: Record<string, KassaCartItem[]> = {
    ...orders,
    [toSlotKey]: merged,
    [fromSlotKey]: [],
  }
  return { next, movedLineCount: fromLines.length }
}
