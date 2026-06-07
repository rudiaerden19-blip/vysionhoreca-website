import {
  validateGksFdmMarkSuccessPayload,
} from '@/lib/gks-kassa/gks-fiscal-server-guards'

describe('gks-fiscal-server-guards', () => {
  it('rejects mark_success zonder fdmRef', () => {
    const r = validateGksFdmMarkSuccessPayload({ eventOperation: 'SALE' })
    expect(r.ok).toBe(false)
  })

  it('rejects SALE zonder shortSignature/verificationUrl', () => {
    const r = validateGksFdmMarkSuccessPayload({
      eventOperation: 'SALE',
      fdmRef: { eventCounter: 1 },
      posFiscalTicketNo: 42,
    })
    expect(r.ok).toBe(false)
  })

  it('accepts geldige SALE payload', () => {
    const r = validateGksFdmMarkSuccessPayload({
      eventOperation: 'SALE',
      fdmRef: { eventCounter: 1, totalCounter: 2 },
      posFiscalTicketNo: 42,
      shortSignature: 'AB12CD34',
      verificationUrl: 'https://example.com/verify/1',
    })
    expect(r.ok).toBe(true)
  })

  it('accepts ORDER (P) zonder QR', () => {
    const r = validateGksFdmMarkSuccessPayload({
      eventOperation: 'ORDER',
      fdmRef: { eventCounter: 3 },
      posFiscalTicketNo: 10,
    })
    expect(r.ok).toBe(true)
  })
})
