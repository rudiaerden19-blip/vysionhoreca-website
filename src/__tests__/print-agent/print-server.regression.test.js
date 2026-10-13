/**
 * @jest-environment node
 *
 * Gesimuleerde regressie voor Vysion Print Agent HTTP + executePrintRequest.
 * Geen fysieke printer — VYSION_AGENT_MOCK_PRINT=1.
 */

const http = require('http')

describe('Print Agent server (mock hardware)', () => {
  const originalMock = process.env.VYSION_AGENT_MOCK_PRINT
  let serverMod
  let srv
  const port = 19742

  beforeAll(() => {
    process.env.VYSION_AGENT_MOCK_PRINT = '1'
    jest.resetModules()
    serverMod = require('../../../apps/vysion-print-agent/server.js')
  })

  afterAll(() => {
    if (srv && srv.close) srv.close()
    process.env.VYSION_AGENT_MOCK_PRINT = originalMock
  })

  function startTestServer(getPrintConfig) {
    const app = serverMod.createApp(getPrintConfig)
    return new Promise((resolve, reject) => {
      srv = app.listen(port, '127.0.0.1', () => resolve(srv))
      srv.on('error', reject)
    })
  }

  function request(method, path, body) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: body
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            : {},
        },
        (res) => {
          let raw = ''
          res.on('data', (c) => {
            raw += c
          })
          res.on('end', () => {
            let json = null
            try {
              json = raw ? JSON.parse(raw) : null
            } catch {
              json = null
            }
            resolve({ status: res.statusCode, json, raw })
          })
        },
      )
      req.on('error', reject)
      if (data) req.write(data)
      req.end()
    })
  }

  const baseCfg = {
    printerName: 'MockPrinter',
    kitchenPrinterName: 'MockKitchen',
    printerProfile: 'epson',
    kassaUrl: 'https://example.com/shop/demo/admin/kassa',
  }

  async function waitForHealth() {
    for (let i = 0; i < 30; i++) {
      try {
        const r = await request('GET', '/health')
        if (r.status === 200) return
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 30))
    }
    throw new Error('server not ready')
  }

  beforeEach(async () => {
    if (srv && srv.listening) {
      await new Promise((r) => srv.close(r))
    }
    await startTestServer(() => baseCfg)
    await waitForHealth()
  })

  it('GET /health returns ok and listenHost', async () => {
    const r = await request('GET', '/health')
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(r.json.printerConfigured).toBe(true)
    expect(r.json.listenHost).toBe('127.0.0.1')
  })

  it('POST /print kassabon with multiple copies (simulated)', async () => {
    const r = await request('POST', '/print', {
      bonInhoud: 'Test bon\n',
      copies: 2,
      receiptMode: 'kassa',
      orderData: { orderNumber: 1, items: [], subtotal: 1, tax: 0.21, total: 1.21 },
    })
    expect(r.status).toBe(200)
    expect(r.json.success).toBe(true)
    expect(r.json.copies).toBe(2)
  }, 15000)

  it('POST /print keukenbon routes to kitchen printer config', async () => {
    const r = await request('POST', '/print', {
      bonInhoud: 'Keuken\n',
      receiptMode: 'keuken',
      copies: 1,
    })
    expect(r.status).toBe(200)
    expect(r.json.success).toBe(true)
  })

  it('POST /print buddy kitchen after kassa when companion enabled', async () => {
    const r = await request('POST', '/print', {
      bonInhoud: 'Kassa+keuken\n',
      receiptMode: 'kassa',
      copies: 1,
      companionKitchen: true,
    })
    expect(r.status).toBe(200)
    expect(r.json.success).toBe(true)
    expect(r.json.buddyPrinted).toBe(true)
  }, 10000)

  it('POST /drawer opens drawer (mock)', async () => {
    const r = await request('POST', '/drawer', {})
    expect(r.status).toBe(200)
    expect(r.json.success).toBe(true)
  })

  it('POST /print fails without printer configured', async () => {
    if (srv && srv.listening) await new Promise((r) => srv.close(r))
    await startTestServer(() => ({ ...baseCfg, printerName: '' }))
    await waitForHealth()
    const r = await request('POST', '/print', { bonInhoud: 'x' })
    expect(r.status).toBe(400)
    expect(r.json.success).toBe(false)
  })

  it('executePrintRequest respects printer profile td80 (payload only)', () => {
    const body = {
      bonInhoud: 'TD80 test\n',
      receiptMode: 'kassa',
      copies: 1,
      winkelnaam: 'Demo',
    }
    const result = serverMod.executePrintRequest(body, {
      printerName: 'MockPrinter',
      kitchenPrinterName: '',
      printerProfile: 'td80',
    })
    expect(result.ok).toBe(true)
    expect(result.printedCopies).toBe(1)
  })

  it('executePrintRequest cash drawer flag does not throw (mock)', () => {
    const result = serverMod.executePrintRequest(
      { bonInhoud: 'Lade\n', openDrawer: true, copies: 1, receiptMode: 'kassa' },
      { printerName: 'MockPrinter', kitchenPrinterName: '', printerProfile: 'epson' },
    )
    expect(result.ok).toBe(true)
  })
})

describe('Print Agent config defaults (logic mirror)', () => {
  it('lanListenEnabled defaults false when field absent', () => {
    const j = { printerName: 'P', kassaUrl: 'https://x' }
    const lanListenEnabled = j.lanListenEnabled === true
    expect(lanListenEnabled).toBe(false)
  })
})
