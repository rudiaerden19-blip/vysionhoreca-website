/**
 * HTTP alleen op 127.0.0.1 — bonnen vanuit de browser-kassa.
 * ESC/POS bytes → Windows-printernaam (RAW), geen libusb/Zadig.
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
const { spawnSync } = require('child_process')
const fs = require('fs')

const ESC_INIT = Buffer.from([0x1b, 0x40])
const FEED_LINES = (n) => Buffer.from([0x1b, 0x64, Math.min(n, 255)])
/** Veel Epson-modellen: partiele snede */
const CUT_PARTIAL = Buffer.from([0x1d, 0x56, 0x01])

/** Latijn zonder accenten voor stabiele RAW-bytes (Windows driver). */
function encodeReceiptLine(line) {
  const s = (line ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/€/g, 'EUR')
    .replace(/[^\x00-\xff]/g, '?')
  return Buffer.from(`${s}\n`, 'latin1')
}

function buildEscPosPayload(body) {
  const chunks = [ESC_INIT]

  const title = (body.winkelnaam || body.storeName || 'RECEIPT').toString().trim()
  chunks.push(Buffer.from([0x1b, 0x61, 0x01]))
  chunks.push(encodeReceiptLine(title))
  chunks.push(Buffer.from([0x1b, 0x61, 0x00]))
  chunks.push(encodeReceiptLine('--------------------------------'))

  const rawContent = (body.bonInhoud || body.receiptText || '').toString()
  const lines = rawContent.split(/\r?\n/)
  for (const line of lines) {
    chunks.push(encodeReceiptLine(line || ' '))
  }

  chunks.push(FEED_LINES(3))
  chunks.push(CUT_PARTIAL)

  return Buffer.concat(chunks)
}

function getPrintScriptPath() {
  try {
    const { app } = require('electron')
    if (app?.isPackaged && process.resourcesPath) {
      const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'print-raw.ps1')
      if (fs.existsSync(unpacked)) return unpacked
    }
  } catch {
    /* niet-Electron context */
  }
  return path.join(__dirname, 'print-raw.ps1')
}

function printRawWindows(printerName, payloadBuffer) {
  const ps1 = getPrintScriptPath()
  if (!fs.existsSync(ps1)) {
    return { ok: false, error: 'print-raw.ps1 niet gevonden (installatie corrupt).' }
  }
  const b64 = payloadBuffer.toString('base64')
  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-PrinterName', printerName, '-Base64Data', b64],
    { encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024 }
  )
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`
    return { ok: false, error: err }
  }
  return { ok: true }
}

function listWindowsPrintersSync() {
  const script =
    'Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name | ConvertTo-Json'
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf-8' })
  if (r.status !== 0 || !r.stdout) return []
  try {
    const parsed = JSON.parse(r.stdout.trim())
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
    return parsed ? [parsed] : []
  } catch {
    return []
  }
}

function createApp(getPrinterName /* () => string | null */) {
  const app = express()

  /** Chromium: HTTPS-pagina → localhost mag pas na deze header (Private Network Access). */
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true')
    next()
  })

  app.use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Access-Control-Request-Private-Network'],
    })
  )
  app.use(express.json({ limit: '512kb' }))

  app.get('/health', (_req, res) => {
    const name = getPrinterName()
    res.json({
      ok: true,
      service: 'vysion-print-agent',
      printerConfigured: !!name,
      printerName: name || null,
    })
  })

  app.get('/printers', (_req, res) => {
    try {
      const printers = listWindowsPrintersSync()
      res.json({ ok: true, printers })
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.post('/print', (req, res) => {
    const printerName = getPrinterName()
    if (!printerName) {
      return res.status(400).json({
        success: false,
        error: 'Geen printer gekozen. Open Vysion Print Agent → Instellingen.',
      })
    }
    try {
      const payload = buildEscPosPayload(req.body || {})
      const result = printRawWindows(printerName, payload)
      if (!result.ok) {
        console.error('[print]', result.error)
        return res.status(500).json({ success: false, error: result.error })
      }
      return res.json({ success: true, message: 'OK' })
    } catch (e) {
      console.error('[print]', e)
      return res.status(500).json({ success: false, error: String(e?.message || e) })
    }
  })

  return app
}

function startServer(getPrinterName, port = 9742) {
  const app = createApp(getPrinterName)
  const srv = app.listen(port, '127.0.0.1', () => {
    console.log(`Vysion Print Agent luistert op http://127.0.0.1:${port}`)
  })
  return srv
}

module.exports = {
  createApp,
  startServer,
  buildEscPosPayload,
  printRawWindows,
  listWindowsPrintersSync,
}
