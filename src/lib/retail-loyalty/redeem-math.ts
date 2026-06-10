/** Euro-korting uit ingewisselde punten (bijv. 100 pt = €1 → redeemPointsPerEuro = 100). */
export function computeRetailLoyaltyRedeemEuroDiscount(
  redeemPoints: number,
  redeemPointsPerEuro: number,
): number {
  if (!(redeemPoints > 0) || !(redeemPointsPerEuro > 0)) return 0
  const euros = redeemPoints / redeemPointsPerEuro
  return Math.round(euros * 100) / 100
}

/** Maximaal inwisselbare punten zonder korting boven bonbedrag. */
export function maxRetailLoyaltyRedeemPoints(
  balance: number,
  cartTotalEuro: number,
  redeemPointsPerEuro: number,
): number {
  if (!(balance > 0) || !(cartTotalEuro > 0) || !(redeemPointsPerEuro > 0)) return 0
  let cap = Math.min(balance, Math.ceil(cartTotalEuro * redeemPointsPerEuro))
  while (
    cap > 0 &&
    computeRetailLoyaltyRedeemEuroDiscount(cap, redeemPointsPerEuro) > cartTotalEuro + 0.005
  ) {
    cap -= 1
  }
  return Math.max(0, cap)
}
