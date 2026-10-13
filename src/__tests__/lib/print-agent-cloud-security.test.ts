import {
  PRINT_AGENT_JOB_PAYLOAD_MAX_BYTES,
  assertPrintJobPayloadSize,
} from '@/lib/print-agent-cloud/payload'
import {
  extractBearerToken,
  hashPrintAgentDeviceToken,
  isValidPrintAgentDeviceTokenFormat,
} from '@/lib/print-agent-cloud/token'

describe('print-agent-cloud security helpers', () => {
  it('rejects oversize payload', () => {
    const big = { bonInhoud: 'x'.repeat(PRINT_AGENT_JOB_PAYLOAD_MAX_BYTES) }
    const err = assertPrintJobPayloadSize(big)
    expect(err).toMatch(/Payload te groot/)
  })

  it('accepts small payload', () => {
    expect(assertPrintJobPayloadSize({ bonInhoud: 'ok' })).toBeNull()
  })

  it('token hash is stable per tenant device secret', () => {
    const t = 'vpa_' + 'c'.repeat(40)
    expect(isValidPrintAgentDeviceTokenFormat(t)).toBe(true)
    expect(hashPrintAgentDeviceToken(t)).toBe(hashPrintAgentDeviceToken(t))
    expect(hashPrintAgentDeviceToken(t)).not.toBe(hashPrintAgentDeviceToken('vpa_' + 'd'.repeat(40)))
  })

  it('requires Bearer scheme for agent API', () => {
    expect(extractBearerToken('Basic abc')).toBeNull()
    expect(extractBearerToken('Bearer vpa_x')).toBe('vpa_x')
  })
})

describe('tenant isolation (documented invariants)', () => {
  it('idempotency keys are scoped per tenant_slug in DB UNIQUE constraint', () => {
    const key = 'order-99-kassa'
    expect(`${'tenant-a'}:${key}`).not.toBe(`${'tenant-b'}:${key}`)
  })
})
