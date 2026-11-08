export type TenantLicenseInvoiceStatus = 'paid' | 'pending' | 'overdue'

export type TenantLicenseInvoiceInput = {
  id?: string
  invoice_number: string
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
  status: string
  description: string | null
  due_date: string | null
  paid_at: string | null
  created_at: string
  updated_at?: string | null
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

  return {
    tenant_slug: slug,
    invoice_number: input.invoice_number.trim(),
    amount: Math.round(Number(input.amount) * 100) / 100,
    status,
    description: (input.description || defaultLicenseInvoiceDescription()).trim(),
    due_date: due,
    paid_at: paidAt,
    created_at: invoiceDate,
    updated_at: new Date().toISOString(),
  }
}

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
