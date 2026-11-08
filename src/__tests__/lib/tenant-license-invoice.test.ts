import {
  buildLicenseInvoiceDbPayload,
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
    expect(row.amount).toBe(99)
    expect(row.status).toBe('paid')
    expect(String(row.paid_at)).toContain('2026-11-05')
  })

  it('suggestNextLicenseInvoiceNumber verhoogt teller', () => {
    const a = suggestNextLicenseInvoiceNumber('demo', [])
    const b = suggestNextLicenseInvoiceNumber('demo', [{ invoice_number: a }])
    expect(a).not.toBe(b)
  })
})
