/**
 * Superadmin/SQL per tenant: kassaslip zonder Print Agent buddy-keuken (sneller bon).
 * Alleen bij receiptMode `kassa`. Expliciete keukenbon + keukenscherm ongewijzigd.
 */
export function shouldSkipBuddyKitchenOnKassaDraftBon(
  settings: { kassa_draft_bon_skip_buddy_kitchen?: boolean | null } | null | undefined,
): boolean {
  return settings?.kassa_draft_bon_skip_buddy_kitchen === true
}
