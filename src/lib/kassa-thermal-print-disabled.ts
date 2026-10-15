/** Superadmin per tenant: geen thermische bon, geen print-agent, geen print-UI. Default uit (alle klanten). */

export function isKassaThermalPrintDisabled(
  settings: { kassa_thermal_print_disabled?: boolean | null } | null | undefined,
): boolean {
  return settings?.kassa_thermal_print_disabled === true
}
