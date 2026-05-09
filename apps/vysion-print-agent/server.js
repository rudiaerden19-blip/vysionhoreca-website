/**
 * HTTP alleen op 127.0.0.1 — bonnen vanuit de browser-kassa.
 * ESC/POS bytes → Windows-printernaam (RAW), geen libusb/Zadig.
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

// ESC/POS commando's
const ESC = 0x1b
const GS = 0x1d
const ESC_INIT        = Buffer.from([ESC, 0x40])
const ALIGN_CENTER    = Buffer.from([ESC, 0x61, 0x01])
const ALIGN_LEFT      = Buffer.from([ESC, 0x61, 0x00])
const BOLD_ON         = Buffer.from([ESC, 0x45, 0x01])
const BOLD_OFF        = Buffer.from([ESC, 0x45, 0x00])
const DOUBLE_HEIGHT   = Buffer.from([GS,  0x21, 0x01])
const DOUBLE_SIZE     = Buffer.from([GS,  0x21, 0x11])
const NORMAL_SIZE     = Buffer.from([GS,  0x21, 0x00])
const CUT_PARTIAL     = Buffer.from([GS,  0x56, 0x01])
const FEED_LINES      = (n) => Buffer.from([ESC, 0x64, Math.min(n, 255)])
/** Donkerder printen (double-strike) — bon is dan goed leesbaar. */
const EMPHASIZE_ON    = Buffer.from([ESC, 0x47, 0x01])
const EMPHASIZE_OFF   = Buffer.from([ESC, 0x47, 0x00])
/** Meer ruimte tussen regels zodat tekst niet plakt. */
const LINE_SPACING_W  = Buffer.from([ESC, 0x33, 0x3C])
const LINE_SPACING_N  = Buffer.from([ESC, 0x33, 0x1E])

function enc(text) {
  const s = (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/€/g, 'E')
    .replace(/[^\x00-\xff]/g, '?')
  return Buffer.from(`${s}\n`, 'latin1')
}

/** Plain text (geen line feed). */
function encInline(text) {
  const s = (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/€/g, 'E')
    .replace(/[^\x00-\xff]/g, '?')
  return Buffer.from(s, 'latin1')
}

function padRow(left, right, width) {
  const pad = Math.max(1, width - left.length - right.length)
  return Buffer.from(`${left}${' '.repeat(pad)}${right}\n`, 'latin1')
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

/**
 * 1-op-1 port van de iPad-app `PrinterManager.swift::printReceipt`.
 * Belangrijke regels:
 *  - Op 80mm thermische printers is de regel ~42 chars in NORMAL en in DOUBLE_HEIGHT
 *    (alleen verticaal verdubbeld). Bij DOUBLE_SIZE (2x2) is dat ~21 chars.
 *  - Belangrijke regels (ITEM, AFHALEN, TOTAAL) staan in DOUBLE_HEIGHT zodat de
 *    keuken/kassier ze van een afstand kan lezen.
 */
function buildRichReceipt(body) {
  const { orderData, businessInfo, winkelnaam } = body
  const W = 42
  const sep = '-'.repeat(W) + '\n'
  const c = []

  // Init
  c.push(ESC_INIT)
  c.push(EMPHASIZE_ON)
  c.push(BOLD_ON)
  c.push(LINE_SPACING_W)

  // ==================== HEADER ====================
  c.push(Buffer.from('\n', 'latin1'))
  c.push(ALIGN_CENTER)

  c.push(DOUBLE_SIZE)
  c.push(enc(businessInfo?.name || winkelnaam || 'RECEIPT'))
  c.push(NORMAL_SIZE)

  if (businessInfo?.address) c.push(enc(businessInfo.address))
  if (businessInfo?.postalCode || businessInfo?.city)
    c.push(enc(`${businessInfo.postalCode || ''} ${businessInfo.city || ''}`.trim()))
  if (businessInfo?.phone) c.push(enc(`Tel: ${businessInfo.phone}`))

  c.push(Buffer.from('\n', 'latin1'))
  c.push(Buffer.from(sep, 'latin1'))

  // ==================== ORDER TYPE ====================
  c.push(DOUBLE_HEIGHT)
  const orderType = (orderData?.orderType || 'TAKEAWAY').toString().toUpperCase()
  let typeLabel = 'AFHALEN'
  if (orderType === 'DINE_IN' || orderType === 'DINE-IN') typeLabel = 'HIER OPETEN'
  else if (orderType === 'DELIVERY') typeLabel = '=> BEZORGEN'
  else if (orderType === 'TAKEAWAY' || orderType === 'PICKUP') typeLabel = '>> AFHALEN'
  c.push(enc(typeLabel))
  if (orderData?.tableNumber) c.push(enc(`Tafel ${orderData.tableNumber}`))
  c.push(NORMAL_SIZE)

  c.push(Buffer.from('\n', 'latin1'))

  // ==================== BON# + DATUM ====================
  c.push(ALIGN_LEFT)
  const now = new Date().toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
  c.push(padRow(`Bon #${orderData?.orderNumber ?? '?'}`, now, W))

  // ==================== ONLINE BESTELLING BLOK ====================
  const isOnline = orderData?.isOnlineOrder !== false &&
    (orderData?.isOnlineOrder === true ||
     orderData?.requestedDateTime ||
     orderData?.customerName ||
     orderData?.customerPhone ||
     orderData?.customerNotes)

  if (isOnline) {
    c.push(Buffer.from('\n', 'latin1'))
    c.push(Buffer.from(sep, 'latin1'))
    c.push(Buffer.from('\n', 'latin1'))

    c.push(ALIGN_CENTER)
    c.push(DOUBLE_HEIGHT)
    c.push(enc('*** ONLINE BESTELLING ***'))
    c.push(NORMAL_SIZE)
    c.push(Buffer.from('\n', 'latin1'))

    c.push(ALIGN_LEFT)
    if (orderData?.requestedDateTime) {
      c.push(enc(`GEWENST: ${orderData.requestedDateTime}`))
      c.push(Buffer.from('\n', 'latin1'))
    }
    if (orderData?.customerName) c.push(enc(`Klant: ${orderData.customerName}`))
    if (orderData?.customerPhone) c.push(enc(`Tel: ${orderData.customerPhone}`))
    if (orderData?.customerAddress) c.push(enc(`Adres: ${orderData.customerAddress}`))
    if (orderData?.customerNotes) {
      c.push(Buffer.from('\n', 'latin1'))
      c.push(enc('OPMERKING:'))
      c.push(enc(String(orderData.customerNotes)))
    }
  }

  c.push(Buffer.from('\n', 'latin1'))
  c.push(Buffer.from(sep, 'latin1'))
  c.push(Buffer.from('\n', 'latin1'))

  // ==================== ITEMS ====================
  c.push(ALIGN_LEFT)
  for (const item of (orderData?.items || [])) {
    const qty = parseNumber(item.quantity) || 1
    const name = item.name || 'Item'
    const price = parseNumber(item.price)

    c.push(DOUBLE_HEIGHT)
    c.push(padRow(`${qty}x ${name}`, `E${price.toFixed(2)}`, W))
    c.push(NORMAL_SIZE)

    const choices = item.choices || item.options || []
    for (const ch of choices) {
      const cn = ch.name || ch.optionName || ''
      const cp = parseNumber(ch.price)
      if (cp > 0) c.push(enc(`   + ${cn}  E${cp.toFixed(2)}`))
      else c.push(enc(`   + ${cn}`))
    }

    c.push(Buffer.from('\n', 'latin1'))
  }

  c.push(Buffer.from(sep, 'latin1'))

  // ==================== TOTALEN ====================
  const subtotal = parseNumber(orderData?.subtotal)
  const tax = parseNumber(orderData?.tax)
  const total = parseNumber(orderData?.total)
  const vatRate = parseNumber(businessInfo?.vatRate) || 21

  c.push(DOUBLE_HEIGHT)
  c.push(padRow('Subtotaal', `E${subtotal.toFixed(2)}`, W))
  c.push(padRow(`BTW (${vatRate}%)`, `E${tax.toFixed(2)}`, W))
  c.push(NORMAL_SIZE)

  c.push(Buffer.from('\n', 'latin1'))
  c.push(Buffer.from(sep, 'latin1'))

  // ==================== TOTAAL ====================
  c.push(Buffer.from('\n', 'latin1'))
  c.push(DOUBLE_HEIGHT)
  c.push(padRow('TOTAAL', `E${total.toFixed(2)}`, W))
  c.push(NORMAL_SIZE)

  // ==================== BETAALMETHODE ====================
  c.push(Buffer.from('\n', 'latin1'))
  c.push(ALIGN_CENTER)
  const pm = (orderData?.paymentMethod || 'ONLINE').toString().toUpperCase()
  let payLabel = orderData?.paymentMethod || 'Online betaald'
  if (pm === 'CASH') payLabel = 'Contant'
  else if (pm === 'CARD') payLabel = 'PIN/Kaart'
  else if (pm === 'IDEAL') payLabel = 'iDEAL'
  else if (pm === 'BANCONTACT') payLabel = 'Bancontact'
  else if (pm === 'ONLINE') payLabel = 'Online betaald'
  c.push(enc(`Betaald met: ${payLabel}`))

  c.push(Buffer.from('\n', 'latin1'))
  c.push(Buffer.from(sep, 'latin1'))

  // ==================== FOOTER ====================
  if (businessInfo?.vatNumber) {
    c.push(Buffer.from('\n', 'latin1'))
    c.push(enc(`BTW: ${businessInfo.vatNumber}`))
  }

  c.push(Buffer.from('\n', 'latin1'))
  c.push(enc('Bedankt voor uw bestelling!'))
  if (businessInfo?.website) c.push(enc(String(businessInfo.website)))

  // Reset
  c.push(NORMAL_SIZE)
  c.push(BOLD_OFF)
  c.push(EMPHASIZE_OFF)
  c.push(LINE_SPACING_N)

  c.push(FEED_LINES(6))
  c.push(CUT_PARTIAL)

  return Buffer.concat(c)
}

function buildEscPosPayload(body) {
  // Gebruik rijke bon als orderData aanwezig is — geeft mooiste resultaat
  if (body && body.orderData) return buildRichReceipt(body)

  /**
   * Fallback wanneer de website (oude versie) alleen platte `bonInhoud` stuurt.
   * Bewust simpel: hele bon staat in DOUBLE_HEIGHT (alles dubbel zo hoog),
   * met extra ruimte voor item-regels en totaalregels. Geen slimme rewrites
   * die de structuur kapot maken.
   */
  const W = 42
  const c = []

  c.push(ESC_INIT)
  c.push(EMPHASIZE_ON)
  c.push(BOLD_ON)
  c.push(LINE_SPACING_W)

  // Header: bedrijfsnaam centered. Lange namen (>21 chars) krijgen
  // alleen DOUBLE_HEIGHT zodat ze niet over 2 regels breken in DOUBLE_SIZE.
  c.push(Buffer.from('\n', 'latin1'))
  c.push(ALIGN_CENTER)
  const title = (body?.winkelnaam || body?.storeName || 'RECEIPT').toString().trim()
  if (title.length > 21) {
    c.push(DOUBLE_HEIGHT)
    c.push(enc(title))
    c.push(NORMAL_SIZE)
  } else {
    c.push(DOUBLE_SIZE)
    c.push(enc(title))
    c.push(NORMAL_SIZE)
  }
  c.push(Buffer.from('\n', 'latin1'))
  c.push(ALIGN_LEFT)

  /** Hele body in dubbele hoogte → alles staat 2x zo groot. */
  c.push(DOUBLE_HEIGHT)

  const RE_ITEM    = /^(\d+)\s*[xX]\s+\S/
  const RE_TOTAL   = /^TOTA(A?)L\b/i
  const RE_BEDANKT = /^(BEDANKT|DANK\s*U|THANK\s*YOU)/i
  const RE_BETAALD = /^(BETAALD)/i

  const raw = (body?.bonInhoud || body?.receiptText || '').toString()
  let lines = raw.split(/\r?\n/)

  /**
   * Skip lege regels en duplicaten van de winkelnaam aan het begin —
   * de website plakt vaak de naam óók in bonInhoud waardoor we hem 2x zagen.
   */
  while (lines.length > 0) {
    const first = (lines[0] || '').trim()
    if (first === '' || first === title) {
      lines = lines.slice(1)
      continue
    }
    break
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || ''
    const trimmed = line.trim()

    // Lege regel = extra witruimte tussen secties
    if (trimmed === '') {
      c.push(Buffer.from('\n', 'latin1'))
      continue
    }

    // Voor TOTAAL: extra witruimte ervoor + scheidingsstreep
    if (RE_TOTAL.test(trimmed)) {
      c.push(Buffer.from('\n', 'latin1'))
    }

    // Voor "Bedankt..." en "Betaald met...": ruimte ervoor
    if (RE_BEDANKT.test(trimmed) || RE_BETAALD.test(trimmed)) {
      c.push(Buffer.from('\n', 'latin1'))
    }

    // De regel zelf
    c.push(enc(line))

    // Na ITEM-lijn (1x ..., 2x ...): lege regel zodat items niet plakken
    if (RE_ITEM.test(trimmed)) {
      c.push(Buffer.from('\n', 'latin1'))
    }
  }

  // Reset stijlen
  c.push(NORMAL_SIZE)
  c.push(BOLD_OFF)
  c.push(EMPHASIZE_OFF)
  c.push(LINE_SPACING_N)

  // Voldoende papier vóór de cut zodat "Bedankt" niet wordt afgesneden
  c.push(FEED_LINES(8))
  c.push(CUT_PARTIAL)
  return Buffer.concat(c)
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
  /**
   * Windows command-line max ~8191 chars; bon base64 overschrijdt dat snel → altijd via temp file.
   * Random suffix voorkomt collisions bij snelle opeenvolgende prints (bv. copies=2 + 2e bestelling).
   */
  const rand = crypto.randomBytes(8).toString('hex')
  const tmpFile = path.join(os.tmpdir(), `vysion-raw-${process.pid}-${Date.now()}-${rand}.b64`)
  try {
    fs.writeFileSync(tmpFile, b64, 'utf8')
    const r = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        ps1,
        '-PrinterName',
        printerName,
        '-Base64Path',
        tmpFile,
      ],
      {
        encoding: 'utf-8',
        maxBuffer: 8 * 1024 * 1024,
        /** Hard timeout: voorkomt dat een hangende PowerShell de hele agent blokkeert. */
        timeout: 15000,
        windowsHide: true,
      }
    )
    if (r.error) {
      return { ok: false, error: String(r.error.message || r.error) }
    }
    if (r.status !== 0) {
      const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`
      return { ok: false, error: err }
    }
    return { ok: true }
  } finally {
    try {
      fs.unlinkSync(tmpFile)
    } catch {
      /* ignore */
    }
  }
}

/** Korte synchrone pauze (zonder CPU te verbranden) tussen kopieën zodat de printer-spool kan resetten. */
function sleepSyncMs(ms) {
  try {
    const buf = new Int32Array(new SharedArrayBuffer(4))
    Atomics.wait(buf, 0, 0, ms)
  } catch {
    /** Fallback voor exotische runtimes: korte busy-wait. */
    const end = Date.now() + ms
    while (Date.now() < end) { /* noop */ }
  }
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

  /** Expliciete OPTIONS preflight handler voor Chrome/Edge Private Network Access.
   *  Moet vóór alle andere middleware staan zodat preflights direct beantwoord worden. */
  app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network')
    res.setHeader('Access-Control-Allow-Private-Network', 'true')
    res.setHeader('Access-Control-Max-Age', '86400')
    res.status(204).end()
  })

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
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
      const body = req.body || {}
      const payload = buildEscPosPayload(body)
      /**
       * Default 2 exemplaren (klant + keuken). Website kan dit overschrijven
       * met een expliciete `copies` waarde.
       */
      const copies = (typeof body.copies === 'number' && body.copies >= 1)
        ? Math.min(Math.max(body.copies, 1), 5)
        : 2

      let lastError = null
      let printedCount = 0
      for (let i = 0; i < copies; i++) {
        const result = printRawWindows(printerName, payload)
        if (!result.ok) {
          lastError = result.error
          console.error(`[print] copy ${i + 1}/${copies} → ${result.error}`)
          break
        }
        printedCount++
        if (i < copies - 1) sleepSyncMs(700)
      }

      if (printedCount === copies) {
        return res.json({ success: true, message: 'OK', copies: printedCount })
      }
      return res.status(500).json({
        success: false,
        error: lastError || 'Print mislukt',
        printed: printedCount,
        requested: copies,
      })
    } catch (e) {
      console.error('[print] exception', e)
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
  sleepSyncMs,
}
