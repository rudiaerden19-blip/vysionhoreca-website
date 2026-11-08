export const LICENSE_INVOICE_VAT_RATE = 0.21

export type TenantLicenseInvoiceStatus = 'paid' | 'pending' | 'overdue'

export type TenantLicenseInvoiceInput = {
  id?: string
  invoice_number: string
  /** Bedrag exclusief 21% BTW (Belgische licentiefactuur). */
  amount: number
  status: TenantLicenseInvoiceStatus
  description?: string
  /** Factuurdatum / zichtbare datum in tenant-admin */
  invoice_date?: string
  due_date?: string
  paid_at?: string | null
}

export type TenantLicenseInvoiceRow = {
  id: string
  tenant_slug: string
  invoice_number: string
  amount: number
  amount_excl_vat?: number | null
  vat_rate?: number | null
  status: string
  description: string | null
  due_date: string | null
  paid_at: string | null
  created_at: string
  updated_at?: string | null
}

export function roundLicenseEuro(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function licenseInvoiceInclFromExcl(
  amountExcl: number,
  vatRate = LICENSE_INVOICE_VAT_RATE,
): number {
  return roundLicenseEuro(amountExcl * (1 + vatRate))
}

export function licenseInvoiceVatFromExcl(
  amountExcl: number,
  vatRate = LICENSE_INVOICE_VAT_RATE,
): number {
  return roundLicenseEuro(amountExcl * vatRate)
}

export function formatLicenseInvoiceAmounts(row: {
  amount: number
  amount_excl_vat?: number | null
  vat_rate?: number | null
}): { excl: number; vat: number; incl: number; vatRate: number } {
  const vatRate =
    row.vat_rate != null && Number(row.vat_rate) >= 0
      ? Number(row.vat_rate)
      : LICENSE_INVOICE_VAT_RATE
  const exclStored = Number(row.amount_excl_vat)
  if (Number.isFinite(exclStored) && exclStored > 0) {
    const incl = roundLicenseEuro(Number(row.amount))
    const vat = roundLicenseEuro(incl - exclStored)
    return { excl: exclStored, vat, incl, vatRate }
  }
  const excl = roundLicenseEuro(Number(row.amount))
  const incl = licenseInvoiceInclFromExcl(excl, vatRate)
  const vat = licenseInvoiceVatFromExcl(excl, vatRate)
  return { excl, vat, incl, vatRate }
}

export function licenseInvoiceExclForForm(row: TenantLicenseInvoiceRow): number {
  const exclStored = Number(row.amount_excl_vat)
  if (Number.isFinite(exclStored) && exclStored > 0) return exclStored
  return roundLicenseEuro(Number(row.amount))
}

export function defaultLicenseInvoiceDescription(planLabel?: string): string {
  const base = 'Vysion licentie'
  return planLabel ? `${base} — ${planLabel}` : base
}

/** Superadmin → Supabase `invoices` (tenant licentie, geen retail). */
export function buildLicenseInvoiceDbPayload(
  tenantSlug: string,
  input: TenantLicenseInvoiceInput,
): Record<string, unknown> {
  const slug = tenantSlug.trim().toLowerCase()
  const status = input.status
  const invoiceDate = input.invoice_date
    ? new Date(input.invoice_date).toISOString()
    : new Date().toISOString()
  const due =
    input.due_date != null && input.due_date !== ''
      ? new Date(input.due_date).toISOString()
      : invoiceDate
  let paidAt: string | null = null
  if (status === 'paid') {
    paidAt =
      input.paid_at != null && input.paid_at !== ''
        ? new Date(input.paid_at).toISOString()
        : invoiceDate
  }

  const amountExcl = roundLicenseEuro(Number(input.amount))
  const amountIncl = licenseInvoiceInclFromExcl(amountExcl)

  return {
    tenant_slug: slug,
    invoice_number: input.invoice_number.trim(),
    amount: amountIncl,
    amount_excl_vat: amountExcl,
    vat_rate: LICENSE_INVOICE_VAT_RATE,
    status,
    description: (input.description || defaultLicenseInvoiceDescription()).trim(),
    due_date: due,
    paid_at: paidAt,
    created_at: invoiceDate,
    updated_at: new Date().toISOString(),
  }
}

const OPTIONAL_INVOICE_DB_COLUMNS = [
  'description',
  'due_date',
  'paid_at',
  'updated_at',
  'stripe_payment_intent_id',
  'amount_excl_vat',
  'vat_rate',
] as const

export function parseMissingInvoicesColumn(errorMessage: string): string | null {
  const m = errorMessage.match(/Could not find the '([^']+)' column of 'invoices'/)
  return m?.[1] ?? null
}

/** PostgREST schema-cache: kolom ontbreekt op oude DB → strip en opnieuw proberen. */
export function shrinkInvoicePayloadForMissingColumn(
  row: Record<string, unknown>,
  missingColumn: string,
): Record<string, unknown> {
  const next = { ...row }
  delete next[missingColumn]
  return next
}

export function invoicePayloadInsertMinimum(row: Record<string, unknown>): Record<string, unknown> {
  const keep = ['tenant_slug', 'invoice_number', 'amount', 'status', 'created_at', 'paid_at'] as const
  const out: Record<string, unknown> = {}
  for (const k of keep) {
    if (row[k] !== undefined) out[k] = row[k]
  }
  return out
}

export function isInvoiceSchemaColumnError(message: string): boolean {
  return message.includes("column of 'invoices'") || message.includes('schema cache')
}

export { OPTIONAL_INVOICE_DB_COLUMNS }

export function suggestNextLicenseInvoiceNumber(
  tenantSlug: string,
  existing: { invoice_number: string }[],
): string {
  const prefix = `VYS-${tenantSlug.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}`
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const sameMonth = existing.filter((i) => i.invoice_number.startsWith(`${prefix}-${ym}`))
  const next = sameMonth.length + 1
  return `${prefix}-${ym}-${String(next).padStart(2, '0')}`
}
