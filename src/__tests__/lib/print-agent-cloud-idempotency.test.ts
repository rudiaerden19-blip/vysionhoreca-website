import { buildPrintJobIdempotencyKey } from '@/lib/print-agent-cloud/idempotency'

describe('print job idempotency', () => {
  it('scopes keys per tenant and receipt mode', () => {
    const body = {
      bonInhoud: 'test',
      receiptMode: 'keuken' as const,
      orderData: { orderNumber: 42, items: [], subtotal: 1, tax: 0, total: 1 },
    }
    const a = buildPrintJobIdempotencyKey(body, { tenantSlug: 'zaak-a' })
    const b = buildPrintJobIdempotencyKey(body, { tenantSlug: 'zaak-b' })
    expect(a).not.toBe(b)
    expect(a).toContain('42-keuken')
  })

  it('separates kassa and keuken for same order (two iPads / dual print)', () => {
    const base = {
      bonInhoud: 'x',
      orderData: { orderNumber: 9, items: [], subtotal: 1, tax: 0, total: 1 },
    }
    const kassa = buildPrintJobIdempotencyKey(
      { ...base, receiptMode: 'kassa' },
      { tenantSlug: 't' },
    )
    const keuken = buildPrintJobIdempotencyKey(
      { ...base, receiptMode: 'keuken' },
      { tenantSlug: 't' },
    )
    expect(kassa).not.toBe(keuken)
  })

  it('reprint nonce changes key', () => {
    const body = { bonInhoud: 'a', receiptMode: 'kassa' as const }
    const first = buildPrintJobIdempotencyKey(body, { tenantSlug: 't' })
    const reprint = buildPrintJobIdempotencyKey(body, {
      tenantSlug: 't',
      reprintNonce: 'manual-1',
    })
    expect(first).not.toBe(reprint)
  })
})
