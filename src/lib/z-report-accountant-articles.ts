/** Per-tenant: artikelregels (10 cola, …) in Z-mail / print / PDF naar de boekhouder. Standaard ja. */

export function zReportSendArticlesToAccountant(raw: unknown): boolean {
  if (raw === false || raw === 0 || raw === '0') return false
  if (typeof raw === 'string' && raw.trim().toLowerCase() === 'false') return false
  return true
}
