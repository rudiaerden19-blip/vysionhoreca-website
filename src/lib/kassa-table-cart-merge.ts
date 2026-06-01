import type { KassaCartItem } from '@/lib/kassa-cart-types'

function cloneCartLine(line: KassaCartItem): KassaCartItem {
  return {
    ...line,
    product: { ...line.product },
    choices: line.choices?.map((c) => ({ ...c })),
  }
}

/** Lopende tafelmand + nieuwe karronde (zelfde cartKey → hoeveelheden optellen). */
export function mergeCartLinesForTable(
  parkedOnTable: KassaCartItem[],
  cartRound: KassaCartItem[],
): KassaCartItem[] {
  const map = new Map<string, KassaCartItem>()
  for (const line of parkedOnTable) {
    if (!line?.cartKey) continue
    map.set(line.cartKey, cloneCartLine(line))
  }
  for (const line of cartRound) {
    if (!line?.cartKey) continue
    const prev = map.get(line.cartKey)
    if (prev) {
      map.set(line.cartKey, {
        ...prev,
        quantity: prev.quantity + line.quantity,
      })
    } else {
      map.set(line.cartKey, cloneCartLine(line))
    }
  }
  return [...map.values()]
}
