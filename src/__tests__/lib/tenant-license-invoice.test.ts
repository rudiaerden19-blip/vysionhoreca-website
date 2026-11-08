import {
  buildLicenseInvoiceDbPayload,
  formatLicenseInvoiceAmounts,
  parseMissingInvoicesColumn,
  shrinkInvoicePayloadForMissingColumn,
  suggestNextLicenseInvoiceNumber,
} from '@/lib/tenant-license-invoice'

describe('tenant-license-invoice', () => {
  it('bouwt betaalde factuur met paid_at', () => {
    const row = buildLicenseInvoiceDbPayload('lomichillplay', {
      invoice_number: 'VYS-TEST-001',
      amount: 99,
      status: 'paid',
      invoice_date: '2026-11-01',
      paid_at: '2026-11-05',
    })
    expect(row.tenant_slug).toBe('lomichillplay')
    expect(row.amount_excl_vat).toBe(99)
    expect(row.amount).toBe(119.79)
    expect(row.status).toBe('paid')
    expect(String(row.paid_at)).toContain('2026-11-05')
  })

  it('parseMissingInvoicesColumn uit PostgREST fout', () => {
    expect(
      parseMissingInvoicesColumn(
        "Could not find the 'description' column of 'invoices' in the schema cache",
      ),
    ).toBe('description')
    const row = { amount: 99, description: 'x' }
    expect(shrinkInvoicePayloadForMissingColumn(row, 'description')).toEqual({ amount: 99 })
  })

  it('amount=119.79 zonder excl-kolom is 99 + 21% BTW (geen dubbele BTW)', () => {
    const a = formatLicenseInvoiceAmounts({ amount: 119.79 })
    expect(a.excl).toBe(99)
    expect(a.vat).toBe(20.79)
    expect(a.incl).toBe(119.79)
  })

  it('dubbel btw-opgeslagen (144.95) herstelt naar 99 excl', () => {
    const a = formatLicenseInvoiceAmounts({ amount: 144.95 })
    expect(a.excl).toBe(99)
    expect(a.incl).toBe(119.79)
  })

  it('minimum insert bewaart excl in amount als vat-kolommen ontbreken', () => {
    const row = buildLicenseInvoiceDbPayload('demo', {
      invoice_number: 'X',
      amount: 99,
      status: 'paid',
    })
    const min = shrinkInvoicePayloadForMissingColumn(row, 'amount_excl_vat')
    expect(min.amount).toBe(99)
    expect(min.amount_excl_vat).toBeUndefined()
  })

  it('suggestNextLicenseInvoiceNumber verhoogt teller', () => {
    const a = suggestNextLicenseInvoiceNumber('demo', [])
    const b = suggestNextLicenseInvoiceNumber('demo', [{ invoice_number: a }])
    expect(a).not.toBe(b)
  })
})
