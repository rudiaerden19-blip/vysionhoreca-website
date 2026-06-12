import { ean13CheckDigit } from '@/lib/retail-loyalty/ean13-barcode-svg'

/** Interne EAN-13 range 991… = afrekenbon (897 = tegoed, 899 = winkelpas). */
export const RETAIL_SALE_TICKET_PREFIX = '991'

export function buildRetailSaleTicketEan13(orderNumber: number): string | null {
  if (!(orderNumber > 0) || orderNumber > 999_999_999) return null
  const twelve = `${RETAIL_SALE_TICKET_PREFIX}${String(orderNumber).padStart(9, '0')}`
  if (twelve.length !== 12) return null
  return twelve + ean13CheckDigit(twelve)
}

/** Leesbare groepering onder de streepjescode (EAN-13). */
export function formatEan13Display(code13: string): string {
  const d = code13.replace(/\D/g, '')
  if (d.length !== 13) return d
  return `${d[0]} ${d.slice(1, 7)} ${d.slice(7, 12)} ${d[12]}`
}
