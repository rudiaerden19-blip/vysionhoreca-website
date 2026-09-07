/** Oranje kassa-scherm voor een webshop-bestelling met status `new`. */
export type KassaNewOrderAlert = {
  id: string
  orderNumber: number
  total: number
}

export function buildKassaNewOrderAlert(order: {
  id: string
  order_number?: string | number | null
  total?: number | null
}): KassaNewOrderAlert {
  return {
    id: order.id,
    orderNumber: Number(order.order_number) || 0,
    total: Number(order.total) || 0,
  }
}

/**
 * Bij openen van de kassa: toon het oranje scherm voor bestellingen die
 * al wachtten (kassa stond uit). Zelfde payload als een live-nieuwe order.
 * Reserveringen blijven bewust buiten deze helper.
 */
export function resolveKassaStartupOrderAlert(
  pendingWebshopNew: {
    id: string
    order_number?: string | number | null
    total?: number | null
  }[],
): KassaNewOrderAlert | null {
  const first = pendingWebshopNew[0]
  if (!first?.id) return null
  return buildKassaNewOrderAlert(first)
}
