/**
 * @jest-environment jsdom
 */

import { sendToVysionPrintAgent } from '@/lib/vysion-print-agent-client'

function mockIpadNavigator() {
  Object.defineProperty(global.navigator, 'userAgent', {
    value:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    configurable: true,
  })
  Object.defineProperty(global.navigator, 'platform', { value: 'iPad', configurable: true })
  Object.defineProperty(global.navigator, 'maxTouchPoints', { value: 5, configurable: true })
}

describe('sendToVysionPrintAgent cloud routing', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    mockIpadNavigator()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('uses enqueue API on iPad when cloud flag enabled (no LAN /print)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        ok: true,
        created: true,
        job: { id: '11111111-1111-1111-1111-111111111111', status: 'pending', idempotency_key: 'k' },
      }),
    })
    global.fetch = fetchMock

    const result = await sendToVysionPrintAgent(
      { bonInhoud: 'Bon\n', receiptMode: 'kassa', copies: 2 },
      {
        tenantSlug: 'test-tenant',
        lanPrintEnabled: true,
        cloudPrintEnabled: true,
        tenantDefaultHost: '192.168.1.40',
      },
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.delivery).toBe('cloud_queued')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/print-agent/enqueue')
    expect(init.method).toBe('POST')
    expect(String(init.body)).toContain('test-tenant')
    expect(String(init.body)).not.toContain('192.168.1.40')
  })

  it('falls back to local path when cloud flag off on iPad', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      })
    global.fetch = fetchMock

    await sendToVysionPrintAgent(
      { bonInhoud: 'x', receiptMode: 'kassa' },
      {
        tenantSlug: 't',
        lanPrintEnabled: false,
        cloudPrintEnabled: false,
      },
    )

    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/api/print-agent/enqueue'))).toBe(false)
  })
})
