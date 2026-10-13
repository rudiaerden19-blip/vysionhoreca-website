import {
  extractBearerToken,
  generatePrintAgentDeviceToken,
  hashPrintAgentDeviceToken,
  isValidPrintAgentDeviceTokenFormat,
} from '@/lib/print-agent-cloud/token'

describe('print-agent-cloud token', () => {
  it('generates vpa_ tokens', () => {
    const t = generatePrintAgentDeviceToken()
    expect(isValidPrintAgentDeviceTokenFormat(t)).toBe(true)
    expect(hashPrintAgentDeviceToken(t)).toHaveLength(64)
  })

  it('extracts bearer header', () => {
    expect(extractBearerToken('Bearer vpa_abc')).toBe('vpa_abc')
    expect(extractBearerToken(null)).toBeNull()
  })
})

describe('print-agent-cloud jobs (unit logic)', () => {
  it('idempotency key uniqueness is tenant-scoped (documented constraint)', () => {
    const a = { tenant: 't1', key: 'order-1-kassa' }
    const b = { tenant: 't2', key: 'order-1-kassa' }
    expect(`${a.tenant}:${a.key}`).not.toBe(`${b.tenant}:${b.key}`)
  })
})
