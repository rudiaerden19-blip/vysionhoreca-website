import {
  isValidLanPrintHost,
  resolveVysionPrintAgentOrigin,
  vysionPrintAgentOriginFromHost,
  writeLanPrintHostForTenant,
  readLanPrintHostForTenant,
  kassaLanPrintHostStorageKey,
} from '@/lib/kassa-lan-print'

describe('kassa-lan-print', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('validates IPv4 hosts', () => {
    expect(isValidLanPrintHost('192.168.1.50')).toBe(true)
    expect(isValidLanPrintHost('10.0.0.1')).toBe(true)
    expect(isValidLanPrintHost('999.1.1.1')).toBe(false)
    expect(isValidLanPrintHost('hostname')).toBe(false)
  })

  it('builds agent origin from host', () => {
    expect(vysionPrintAgentOriginFromHost('192.168.1.50')).toBe('http://192.168.1.50:9742')
  })

  it('stores host per tenant', () => {
    writeLanPrintHostForTenant('thelagoon', '192.168.0.10')
    expect(readLanPrintHostForTenant('thelagoon')).toBe('192.168.0.10')
    expect(kassaLanPrintHostStorageKey('thelagoon')).toContain('thelagoon')
  })

  it('returns localhost when lan print disabled', async () => {
    const origin = await resolveVysionPrintAgentOrigin({
      lanPrintEnabled: false,
      tenantSlug: 'demo',
      probeLocalAgent: async () => false,
    })
    expect(origin).toBe('http://127.0.0.1:9742')
  })

  it('uses lan host when enabled and local probe fails', async () => {
    writeLanPrintHostForTenant('demo', '192.168.1.99')
    const origin = await resolveVysionPrintAgentOrigin({
      lanPrintEnabled: true,
      tenantSlug: 'demo',
      probeLocalAgent: async () => false,
    })
    expect(origin).toBe('http://192.168.1.99:9742')
  })

  it('prefers localhost when probe succeeds', async () => {
    writeLanPrintHostForTenant('demo', '192.168.1.99')
    const origin = await resolveVysionPrintAgentOrigin({
      lanPrintEnabled: true,
      tenantSlug: 'demo',
      probeLocalAgent: async () => true,
    })
    expect(origin).toBe('http://127.0.0.1:9742')
  })
})
