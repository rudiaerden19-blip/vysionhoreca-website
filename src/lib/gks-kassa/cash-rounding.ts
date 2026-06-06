/** Contant afronden op 5 cent (MB §7). Max ±2 ct op totaal ticket vs. som lijnen. */

export function roundCashToFiveCents(amount: number): number {
  const cents = Math.round(amount * 100)
  if (cents < 5) return amount
  const mod = cents % 5
  if (mod === 0) return amount
  if (mod === 1 || mod === 2) return (cents - mod) / 100
  if (mod === 3 || mod === 4) return (cents + (5 - mod)) / 100
  if (mod === 6 || mod === 7) return (cents - (mod - 5)) / 100
  return (cents + (10 - mod)) / 100
}

export function cashRoundingDelta(original: number, rounded: number): number {
  return Math.round((rounded - original) * 100) / 100
}
