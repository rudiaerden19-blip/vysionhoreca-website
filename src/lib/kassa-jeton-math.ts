export type KassaJetonCounts = {
  black: number
  white: number
}

export type KassaJetonDenominations = {
  blackCents: number
  whiteCents: number
}

const DEFAULT_BLACK_CENTS = 300
const DEFAULT_WHITE_CENTS = 50

export function normalizeKassaJetonDenominations(
  blackCents: unknown,
  whiteCents: unknown,
): KassaJetonDenominations {
  const black = Math.round(Number(blackCents))
  const white = Math.round(Number(whiteCents))
  return {
    blackCents:
      Number.isFinite(black) && black > 0 ? black : DEFAULT_BLACK_CENTS,
    whiteCents:
      Number.isFinite(white) && white > 0 ? white : DEFAULT_WHITE_CENTS,
  }
}

/** Bedrag in centen moet op witte jeton-stap uitkomen (gcd-structuur). */
export function kassaJetonAmountIsPayableExact(
  amountCents: number,
  denoms: KassaJetonDenominations,
): boolean {
  if (!Number.isFinite(amountCents) || amountCents < 0) return false
  const step = denoms.whiteCents
  return amountCents % step === 0
}

/** Zoveel mogelijk zwarte jetons, rest witte (passend betalen). */
export function kassaJetonBreakdownFromCents(
  amountCents: number,
  denoms: KassaJetonDenominations,
): KassaJetonCounts | null {
  if (!kassaJetonAmountIsPayableExact(amountCents, denoms)) return null
  const black =
    Math.floor(amountCents / denoms.blackCents)
  let rest = amountCents - black * denoms.blackCents
  if (rest % denoms.whiteCents !== 0) {
    return null
  }
  const white = rest / denoms.whiteCents
  return { black, white }
}

export function kassaJetonTotalCents(
  counts: KassaJetonCounts,
  denoms: KassaJetonDenominations,
): number {
  return (
    Math.max(0, counts.black) * denoms.blackCents +
    Math.max(0, counts.white) * denoms.whiteCents
  )
}

export function kassaJetonChangeFromTender(
  orderTotalCents: number,
  received: KassaJetonCounts,
  denoms: KassaJetonDenominations,
): {
  receivedCents: number
  changeCents: number
  change: KassaJetonCounts | null
  netCents: number
  sufficient: boolean
} {
  const receivedCents = kassaJetonTotalCents(received, denoms)
  const changeCents = receivedCents - orderTotalCents
  const change =
    changeCents >= 0
      ? kassaJetonBreakdownFromCents(changeCents, denoms)
      : null
  const netCents = receivedCents - (change ? kassaJetonTotalCents(change, denoms) : 0)
  return {
    receivedCents,
    changeCents,
    change,
    netCents,
    sufficient: changeCents >= 0 && change != null && netCents === orderTotalCents,
  }
}

export function eurosToJetonCents(totalEuros: number): number {
  return Math.round(totalEuros * 100)
}

/** Waarde op fysieke jeton (bijv. 3 of 0,50). */
export function kassaJetonChipFaceLabel(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '?'
  if (cents % 100 === 0) return String(cents / 100)
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** Alleen zwarte ontvangen (wisselgeld = witte jetons). */
export function kassaJetonChangeFromBlackReceived(
  orderTotalCents: number,
  blackReceived: number,
  denoms: KassaJetonDenominations,
): {
  receivedCents: number
  changeCents: number
  whiteChange: number
  sufficient: boolean
} {
  return kassaJetonChangeFromReceived(
    orderTotalCents,
    { black: blackReceived, white: 0 },
    denoms,
  )
}

/** Ontvangen zwart + wit; teruggeven altijd alleen witte jetons. */
export function kassaJetonChangeFromReceived(
  orderTotalCents: number,
  received: KassaJetonCounts,
  denoms: KassaJetonDenominations,
): {
  receivedCents: number
  changeCents: number
  whiteChange: number
  sufficient: boolean
} {
  const receivedCents = kassaJetonTotalCents(
    {
      black: Math.max(0, Math.floor(received.black)),
      white: Math.max(0, Math.floor(received.white)),
    },
    denoms,
  )
  const changeCents = receivedCents - orderTotalCents
  if (changeCents < 0) {
    return { receivedCents, changeCents, whiteChange: 0, sufficient: false }
  }
  if (changeCents === 0) {
    return { receivedCents, changeCents, whiteChange: 0, sufficient: true }
  }
  if (changeCents % denoms.whiteCents !== 0) {
    return { receivedCents, changeCents, whiteChange: 0, sufficient: false }
  }
  const whiteChange = changeCents / denoms.whiteCents
  return { receivedCents, changeCents, whiteChange, sufficient: true }
}
