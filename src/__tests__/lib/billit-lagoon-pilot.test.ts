import {
  BILLIT_LAGOON_TENANT_SLUG,
  billitExternalProviderId,
  getBillitLagoonEnvConfig,
  isBillitLagoonPilotTenant,
} from '@/lib/billit-lagoon-pilot'
import {
  billitLinesVatTotal,
  billitVatFromInclusive,
  billitVatLinesFromSlices,
  buildBillitOrderPayload,
} from '@/lib/billit-sync-z-day'

describe('billit-lagoon-pilot', () => {
  it('only enables pilot for thelagoon slug', () => {
    expect(BILLIT_LAGOON_TENANT_SLUG).toBe('thelagoon')
    expect(isBillitLagoonPilotTenant('thelagoon')).toBe(true)
    expect(isBillitLagoonPilotTenant('TheLagoon')).toBe(true)
    expect(isBillitLagoonPilotTenant('demo-frituur')).toBe(false)
  })

  it('builds stable external provider id per day', () => {
    expect(billitExternalProviderId('thelagoon', '2026-10-28')).toBe('vysion-thelagoon-2026-10-28')
  })

  it('accepts Billit API key UUID as credential', () => {
    const fakeKey = '00000000-0000-4000-8000-000000000001'
    process.env.BILLIT_THELAGOON_API_KEY = fakeKey
    process.env.BILLIT_THELAGOON_SANDBOX = '0'
    const cfg = getBillitLagoonEnvConfig()
    expect(cfg?.apiKey).toBe(fakeKey)
    expect(cfg?.apiBaseUrl).toBe('https://api.billit.be')
    delete process.env.BILLIT_THELAGOON_API_KEY
    delete process.env.BILLIT_THELAGOON_SANDBOX
  })

  it('returns null env config when credentials missing', () => {
    const prevId = process.env.BILLIT_THELAGOON_CLIENT_ID
    const prevSec = process.env.BILLIT_THELAGOON_CLIENT_SECRET
    delete process.env.BILLIT_THELAGOON_CLIENT_ID
    delete process.env.BILLIT_THELAGOON_CLIENT_SECRET
    delete process.env.BILLIT_THELAGOON_EMAIL
    delete process.env.BILLIT_THELAGOON_PASSWORD
    expect(getBillitLagoonEnvConfig()).toBeNull()
    if (prevId) process.env.BILLIT_THELAGOON_CLIENT_ID = prevId
    if (prevSec) process.env.BILLIT_THELAGOON_CLIENT_SECRET = prevSec
  })
})

describe('buildBillitOrderPayload', () => {
  const base = {
    report_date: '2026-10-30',
    order_count: 330,
    subtotal: 2247.32,
    cash_payments: 100,
    card_payments: 2618.5,
    online_payments: 0,
    order_ids: ['a'],
    is_closed: true,
    closed_at: '2026-10-31T01:00:00.000Z',
  }

  it('houdt de btw van de bonnen aan, ook als één dagregel zou afronden', () => {
    const slices = [
      { gross: 10, rate: 21 as const },
      { gross: 10, rate: 21 as const },
    ]
    const packed = billitVatLinesFromSlices(slices)
    expect(billitLinesVatTotal(packed)).toBe(3.48)
    expect(packed.reduce((sum, line) => sum + line.totalIncl, 0)).toBe(20)
    expect(billitVatFromInclusive(20, 21).vat).toBe(3.47)
    expect(packed.some((line) => line.rate === 0)).toBe(true)
    expect(packed.some((line) => line.rate === 21)).toBe(true)

    const payload = buildBillitOrderPayload(
      'thelagoon',
      {
        ...base,
        tax_low: 0,
        tax_mid: 0,
        tax_high: 3.48,
        total: 20,
        order_count: 2,
      },
      slices,
    )
    expect(payload.TotalIncl).toBe(20)
    expect(payload.TotalVAT).toBe(3.48)
    expect(payload.TotalExcl).toBe(16.52)
    const lines = payload.OrderLines as Record<string, unknown>[]
    expect(lines.some((line) => line.VATPercentage === 21 && line.InclLeading === true)).toBe(true)
    expect(String(lines.find((line) => line.VATPercentage === 21)?.Description)).toContain('21% btw')
    expect(String(lines.find((line) => line.VATPercentage === 0)?.Description)).toContain('Afronding btw')
    expect(String(payload.Comments)).toContain('Contant 100.00')
  })

  it('zet geen afrondingsregel als de dag-btw al klopt', () => {
    const packed = billitVatLinesFromSlices([
      { gross: 5, rate: 21 },
      { gross: 5, rate: 21 },
    ])
    expect(packed).toEqual([{ rate: 21, totalIncl: 10 }])
    expect(billitLinesVatTotal(packed)).toBe(1.74)
  })

  it('splitst 6, 12 en 21 zonder 0%-regel en telt op tot het dagtotaal', () => {
    const slices = [
      { gross: 17.67, rate: 6 as const },
      { gross: 18.67, rate: 12 as const },
      { gross: 17.43, rate: 21 as const },
    ]
    const lines = billitVatLinesFromSlices(slices)
    expect(lines.map((l) => l.rate)).toEqual([6, 12, 21])
    const summed = lines.reduce((sum, line) => sum + line.totalIncl, 0)
    expect(Math.round(summed * 100) / 100).toBe(
      Math.round(slices.reduce((sum, slice) => sum + slice.gross, 0) * 100) / 100,
    )
    expect(billitLinesVatTotal(lines)).toBe(
      Math.round(
        slices.reduce((sum, slice) => sum + billitVatFromInclusive(slice.gross, slice.rate).vat, 0) * 100,
      ) / 100,
    )

    const payload = buildBillitOrderPayload(
      'thelagoon',
      {
        ...base,
        report_date: '2026-10-28',
        order_count: 2,
        subtotal: 80,
        tax_low: 1,
        tax_mid: 2,
        tax_high: 3,
        total: 86,
        cash_payments: 50,
        card_payments: 36,
      },
      slices,
    )
    const orderLines = payload.OrderLines as Record<string, unknown>[]
    expect(orderLines.map((l) => l.VATPercentage)).toEqual([6, 12, 21])
    expect(orderLines.every((l) => l.InclLeading === true)).toBe(true)
    expect(payload.Reference).toBe('vysion-thelagoon-2026-10-28')
  })
})
