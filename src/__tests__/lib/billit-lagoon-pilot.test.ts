import {
  BILLIT_LAGOON_TENANT_SLUG,
  billitExternalProviderId,
  getBillitLagoonEnvConfig,
  isBillitLagoonPilotTenant,
} from '@/lib/billit-lagoon-pilot'
import { buildBillitOrderPayload } from '@/lib/billit-sync-z-day'

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
  it('stuurt de dagomzet één keer, zonder bonnen of betaalwijze als extra regels', () => {
    const payload = buildBillitOrderPayload('thelagoon', {
      report_date: '2026-10-28',
      order_count: 2,
      subtotal: 80,
      tax_low: 1,
      tax_mid: 2,
      tax_high: 3,
      total: 86,
      cash_payments: 50,
      card_payments: 36,
      online_payments: 0,
      order_ids: ['a', 'b'],
      is_closed: true,
      closed_at: '2026-10-28T22:00:00.000Z',
    })

    expect(payload.Reference).toBe('vysion-thelagoon-2026-10-28')
    expect(payload.TotalIncl).toBe(86)
    expect(payload.TotalVAT).toBe(6)
    const lines = payload.OrderLines as Record<string, unknown>[]
    expect(lines).toHaveLength(1)
    expect(lines[0]?.TotalIncl).toBe(86)
    const summed = lines.reduce((sum, line) => sum + Number(line.TotalIncl), 0)
    expect(summed).toBe(86)
    expect(String(payload.Comments)).toContain('Contant 50.00')
    expect(String(payload.Comments)).toContain('2 bonnen')
  })
})
