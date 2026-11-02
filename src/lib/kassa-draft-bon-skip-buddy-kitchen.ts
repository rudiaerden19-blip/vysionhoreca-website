/**
 * Pilot per tenant (SQL/superadmin). Alleen `drnerkebablaakdal` standaard via migratie.
 * - Voorlopige bon: geen buddy-keuken na kassaslip (sneller mand).
 * - Betaalde bon: zelfde agent-flow (buddy blijft); UI wacht niet op POST (zie kassa success print).
 */
export function shouldSkipBuddyKitchenOnKassaDraftBon(
  settings: { kassa_draft_bon_skip_buddy_kitchen?: boolean | null } | null | undefined,
): boolean {
  return settings?.kassa_draft_bon_skip_buddy_kitchen === true
}

export function shouldNonBlockKassaPaidReceiptPrint(
  settings: { kassa_draft_bon_skip_buddy_kitchen?: boolean | null } | null | undefined,
): boolean {
  return settings?.kassa_draft_bon_skip_buddy_kitchen === true
}
