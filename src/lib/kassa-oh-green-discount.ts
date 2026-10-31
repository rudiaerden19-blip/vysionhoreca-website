/** Kortingstoets −20% — alleen tenant Oh Green (`ohgreen`). */

export const OH_GREEN_TICKET_DISCOUNT_RATE = 0.2

function compactTenantToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function isOhGreenKassaTenant(
  slug: string | null | undefined,
  businessName?: string | null,
): boolean {
  if (compactTenantToken(slug) === 'ohgreen') return true
  const name = compactTenantToken(businessName)
  return name.includes('ohgreen')
}

/** 20% van het brutobedrag, afgerond op de cent. Payable = brut − korting. */
export function kassaTicketDiscountFromGross(
  gross: number,
  rate = OH_GREEN_TICKET_DISCOUNT_RATE,
): { discount: number; payable: number } {
  const cents = Math.round(Number(gross) * 100)
  if (!Number.isFinite(cents) || cents <= 0) return { discount: 0, payable: 0 }
  const discountCents = Math.round(cents * rate)
  const payableCents = Math.max(0, cents - discountCents)
  return { discount: discountCents / 100, payable: payableCents / 100 }
}

export function kassaLineGrossEuro(line: {
  product: { price: number }
  choices?: { price: number }[] | null
  quantity: number
}): number {
  const extras = (line.choices || []).reduce((sum, choice) => sum + (Number(choice.price) || 0), 0)
  const qty = Number(line.quantity) || 0
  return Math.round((Number(line.product.price) + extras) * qty * 100) / 100
}

/** Verdeel een doelbedrag over regels, laatste regel vangt de afronding. */
export function allocateGrossCents(lineCents: number[], targetCents: number): number[] {
  const original = lineCents.reduce((sum, cents) => sum + cents, 0)
  if (lineCents.length === 0 || original <= 0) return lineCents.map(() => 0)
  if (original === targetCents) return [...lineCents]
  let assigned = 0
  return lineCents.map((cents, index) => {
    const isLast = index === lineCents.length - 1
    const next = isLast ? targetCents - assigned : Math.round((cents * targetCents) / original)
    assigned += next
    return next
  })
}

/** Kopie met aangepaste stukprijs zodat de som van de regels het doelbedrag is. Keuzenamen blijven. */
export function kassaCartLinesPricedToGross<
  T extends {
    product: { price: number }
    choices?: { price: number }[] | null
    quantity: number
  },
>(lines: T[], targetGross: number): T[] {
  const cents = lines.map((line) => Math.round(kassaLineGrossEuro(line) * 100))
  const allocated = allocateGrossCents(cents, Math.round(targetGross * 100))
  return lines.map((line, index) => {
    const qty = line.quantity > 0 ? line.quantity : 1
    const choices = (line.choices || []).map((choice) => ({ ...choice, price: 0 }))
    return {
      ...line,
      product: { ...line.product, price: allocated[index] / 100 / qty },
      choices,
    }
  })
}
