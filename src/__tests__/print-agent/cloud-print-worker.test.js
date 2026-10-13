/**
 * @jest-environment node
 */

process.env.VYSION_AGENT_MOCK_PRINT = '1'

const { createCloudPrintWorker } = require('../../../apps/vysion-print-agent/cloud-print-worker.js')

describe('cloud-print-worker', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('does nothing when cloudPrintEnabled is false', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock
    const worker = createCloudPrintWorker({
      getConfig: () => ({
        cloudPrintEnabled: false,
        cloudPrintDeviceToken: 'vpa_test',
        cloudPrintApiBase: '',
        printerName: 'P',
        kitchenPrinterName: '',
        printerProfile: 'epson',
        kassaUrl: 'https://x',
      }),
    })
    await worker.pollOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('claims, prints (mock), and acks when enabled', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          job: {
            id: '11111111-1111-1111-1111-111111111111',
            processing_token: '22222222-2222-2222-2222-222222222222',
            payload: { bonInhoud: 'Cloud\n', copies: 1, receiptMode: 'kassa' },
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    global.fetch = fetchMock

    const worker = createCloudPrintWorker({
      getConfig: () => ({
        cloudPrintEnabled: true,
        cloudPrintDeviceToken: 'vpa_' + 'a'.repeat(40),
        cloudPrintApiBase: 'https://example.com',
        printerName: 'MockPrinter',
        kitchenPrinterName: '',
        printerProfile: 'epson',
        kassaUrl: 'https://x',
      }),
    })
    await worker.pollOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/print-agent/ack')
  })

  it('survives fetch failure without throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'))
    const worker = createCloudPrintWorker({
      getConfig: () => ({
        cloudPrintEnabled: true,
        cloudPrintDeviceToken: 'vpa_' + 'b'.repeat(40),
        cloudPrintApiBase: '',
        printerName: 'P',
        kitchenPrinterName: '',
        printerProfile: 'epson',
        kassaUrl: '',
      }),
    })
    await expect(worker.pollOnce()).resolves.toBeUndefined()
  })
})
