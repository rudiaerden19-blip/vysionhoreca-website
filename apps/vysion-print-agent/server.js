/**
 * HTTP alleen op 127.0.0.1 — bonnen vanuit de browser-kassa.
 * ESC/POS bytes → Windows-printernaam (RAW), geen libusb/Zadig.
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
const { spawnSync, spawn } = require('child_process')
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

/**
 * ESC J n — feed n dots (0.125 mm per dot op typische 203 dpi).
 * Op sommige Chinese clone-firmware wordt **n ≥ 0x80** soms als eerste byte van
 * DBCS/Han geïnterpreteerd als het commando wordt gemist → rest van de bon
 * verschuift verkeerd naast bedragen. Daarom altijd opsplitsen tot n ≤ 127.
 */
function feedDots(n) {
  let left = Math.min(Math.max(Math.floor(Number(n) || 0), 0), 255 * 64)
  const parts = []
  while (left > 0) {
    const step = Math.min(left, 127)
    parts.push(Buffer.from([ESC, 0x4a, step]))
    left -= step
  }
  return Buffer.concat(parts)
}
/** Donkerder printen (double-strike) — bon is dan goed leesbaar. */
const EMPHASIZE_ON    = Buffer.from([ESC, 0x47, 0x01])
const EMPHASIZE_OFF   = Buffer.from([ESC, 0x47, 0x00])
/** Meer ruimte tussen regels zodat tekst niet plakt. */
const LINE_SPACING_W  = Buffer.from([ESC, 0x33, 0x3C])
const LINE_SPACING_N  = Buffer.from([ESC, 0x33, 0x1E])
/** PC437 (USA, ESC t 0) — pure ASCII-compatibele glyph-tabel op vrijwel alle ESC/POS‑printers.
 *  PC858 (ESC t 19) gaf op Chinese/Xprinter‑firmware nog verkeerde Han‑tekens naast bedragen,
 *  ook nadat we € door ASCII „EUR“ vervingen. We gebruiken geen hoge PC858‑tekens meer. */
const CODEPAGE_PC437 = Buffer.from([ESC, 0x74, 0x00])
/** Valuta op de bon als ASCII "EUR " i.p.v. byte 0xD5: op GBK/Chinees‑firmware werd 0xD5
 *  met het volgende byte als Han‑teken gelezen (bv. 詠 i.p.v. €). */
const PREFIX_EUR_ASCII = Buffer.from('EUR ', 'latin1')

/** Strip/printer‑veilig: GEEN bytes ≥128 in door klant geleverde tekst.
 *  Veel Chinese thermische printers parsen uitvoer GBK‑achtig: één byte 0xA0‑0xFF
 *  kan de rest van de regel (incl. "EUR ") als Han laten verschuiven → verkeerde glyphe. */
function isSafeEscPosAsciiCode(code) {
  return (
    code === 0x09 || // tab
    code === 0x0a ||
    code === 0x0d ||
    (code >= 0x20 && code <= 0x7e)
  )
}

/** Voor regels die NIET via encInline gaan (bv. padRow + raw datum). */
function to7bitAsciiLine(s) {
  let out = ''
  for (const ch of String(s ?? '')) {
    const code = ch.charCodeAt(0)
    out += isSafeEscPosAsciiCode(code) ? ch : '?'
  }
  return out
}
/** Cash-drawer kick: ESC p 0 50 50 — pulse op pin 2 (~100ms).
 *  Dit is exact het commando dat de Epson APD driver-test gebruikt.
 *  Voor TM-T88V: als RAW write deze bytes filtert door APD, gebruiken we
 *  het GDI ExtEscape PASSTHROUGH-pad (zie open-drawer.ps1). */
const DRAWER_KICK     = Buffer.from([ESC, 0x70, 0x00, 0x32, 0x32])

/**
 * Encodeer tekst naar bytes voor de printer:
 * - Strip diakritische tekens (é → e); daarna alleen 7-bits ASCII naar de printer
 * - Vervang € door ASCII "EUR " (geen 0xD5: Chinese printers lezen dat als GBK/Han).
 * - Alleen ASCII 32–126 (plus tab/newline/carriage return); geen bytes ≥128
 *   (Chinese/GBK‑firmware anders fout‑gesynchroniseerd rond EUR/prijzen).
 * - Voeg \n toe (newline)
 */
function enc(text) {
  return Buffer.concat([encInline(text), Buffer.from([0x0a])])
}

function encInline(text) {
  const s = (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  // Build byte-by-byte; € → ASCII "EUR "
  const out = []
  for (const ch of s) {
    const code = ch.charCodeAt(0)
    if (ch === '€' || code === 8364) {
      out.push(0x45, 0x55, 0x52, 0x20)
      continue
    }
    if (isSafeEscPosAsciiCode(code)) {
      out.push(code)
    } else {
      out.push(0x3f) // '?'
    }
  }
  return Buffer.from(out)
}

function padRow(left, right, width) {
  const l = to7bitAsciiLine(left)
  const r = to7bitAsciiLine(right)
  const pad = Math.max(1, width - l.length - r.length)
  return Buffer.from(`${l}${' '.repeat(pad)}${r}\n`, 'latin1')
}

/**
 * Print "label                    EUR 12.34" — ASCII valuta (ook op Chinese/GBK‑firmware).
 */
function padPrice(label, amount, width) {
  const num = Number(amount).toFixed(2)
  const rightLen = PREFIX_EUR_ASCII.length + num.length
  const pad = Math.max(1, width - label.length - rightLen)
  return Buffer.concat([
    encInline(label),
    Buffer.from(' '.repeat(pad), 'latin1'),
    PREFIX_EUR_ASCII,
    encInline(num),
    Buffer.from([0x0a]),
  ])
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
  c.push(CODEPAGE_PC437)
  c.push(EMPHASIZE_ON)
  c.push(BOLD_ON)
  c.push(LINE_SPACING_W)

  // ==================== HEADER ====================
  c.push(Buffer.from('\n', 'latin1'))
  c.push(ALIGN_CENTER)

  // Bedrijfsnaam: naam > 18 chars → alleen DOUBLE_HEIGHT zodat hij op 1 regel past
  const bizName = (businessInfo?.name || winkelnaam || 'RECEIPT').toString().trim()
  if (bizName.length > 18) {
    c.push(DOUBLE_HEIGHT)
  } else {
    c.push(DOUBLE_SIZE)
  }
  c.push(enc(bizName))
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
    c.push(padPrice(`${qty}x ${name}`, price, W))
    c.push(NORMAL_SIZE)

    const choices = item.choices || item.options || []
    for (const ch of choices) {
      const cn = ch.name || ch.optionName || ''
      const cp = parseNumber(ch.price)
      if (cp > 0) {
        c.push(Buffer.concat([
          encInline(`   + ${cn}  `),
          PREFIX_EUR_ASCII,
          enc(cp.toFixed(2)),
        ]))
      } else {
        c.push(enc(`   + ${cn}`))
      }
    }

    c.push(Buffer.from('\n', 'latin1'))
  }

  c.push(Buffer.from(sep, 'latin1'))

  // ==================== TOTALEN ====================
  const subtotal = parseNumber(orderData?.subtotal)
  const tax = parseNumber(orderData?.tax)
  const total = parseNumber(orderData?.total)
  const vatLines = Array.isArray(orderData?.vatLines) ? orderData.vatLines : []
  const fallbackVatRate = parseNumber(businessInfo?.vatRate) || 21

  c.push(DOUBLE_HEIGHT)
  c.push(padPrice('Subtotaal', subtotal, W))
  if (vatLines.length > 0) {
    for (const row of vatLines) {
      const rate = parseNumber(row.rate) || fallbackVatRate
      const lineTax = parseNumber(row.tax)
      c.push(padPrice(`BTW (${rate}%)`, lineTax, W))
    }
  } else {
    c.push(padPrice(`BTW (${fallbackVatRate}%)`, tax, W))
  }
  c.push(NORMAL_SIZE)

  c.push(Buffer.from('\n', 'latin1'))
  c.push(Buffer.from(sep, 'latin1'))

  // ==================== TOTAAL ====================
  c.push(Buffer.from('\n', 'latin1'))
  c.push(DOUBLE_HEIGHT)
  c.push(padPrice('TOTAAL', total, W))
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

  /**
   * Cutter zit fysiek ~12-15mm verder dan de print-head op Epson TM-printers.
   * Om écht 1 cm zichtbare witruimte ONDER 'Bedankt' te krijgen, moeten we
   * minimaal ~25 mm extra feeden (= 200 dots @ 8 dots/mm).
   */
  c.push(feedDots(160)) // 20 mm
  c.push(feedDots(80))  // + 10 mm = 30 mm totaal
  c.push(CUT_PARTIAL)

  return Buffer.concat(c)
}

/**
 * Volledige keuken-bon — vertaalt 1-op-1 wat het keuken-scherm toont:
 * groot bonnummer, ordertype, geplande tijd, klantgegevens, items met
 * alle opties + per-item-opmerkingen, klant-opmerking, en bedrijfsfooter.
 * Alle items + opties worden DOUBLE_HEIGHT gerenderd zodat de keuken
 * de bon vanaf de bak kan lezen.
 */
function buildKitchenReceipt(body) {
  const { orderData, businessInfo, winkelnaam } = body || {}
  const W = 42
  const sep = '='.repeat(W) + '\n'
  const sepThin = '-'.repeat(W) + '\n'
  const c = []

  c.push(ESC_INIT)
  c.push(CODEPAGE_PC437)
  c.push(EMPHASIZE_ON)
  c.push(BOLD_ON)
  c.push(LINE_SPACING_W)

  // ===== HEADER ===== "*** KEUKEN BON ***"
  c.push(Buffer.from('\n', 'latin1'))
  c.push(ALIGN_CENTER)
  c.push(DOUBLE_HEIGHT)
  c.push(enc('*** KEUKEN BON ***'))
  c.push(NORMAL_SIZE)

  // GROOT bonnummer (DOUBLE_SIZE = 2x breedte + hoogte)
  c.push(DOUBLE_SIZE)
  c.push(enc(`#${orderData?.orderNumber ?? '?'}`))
  c.push(NORMAL_SIZE)

  // Order type — duidelijk en groot
  c.push(DOUBLE_HEIGHT)
  const orderType = (orderData?.orderType || '').toString().toUpperCase()
  let typeLabel = '>> AFHALEN'
  if (orderType === 'DINE_IN' || orderType === 'DINE-IN' || orderType === 'DINEIN') typeLabel = 'HIER OPETEN'
  else if (orderType === 'DELIVERY') typeLabel = '=> BEZORGEN'
  else if (orderType === 'TAKEAWAY' || orderType === 'PICKUP') typeLabel = '>> AFHALEN'
  c.push(enc(typeLabel))
  if (orderData?.tableNumber) c.push(enc(`Tafel ${orderData.tableNumber}`))
  c.push(NORMAL_SIZE)

  // Geplande datum/tijd (📅 LEVEREN OP …)
  if (orderData?.requestedDateTime) {
    c.push(Buffer.from('\n', 'latin1'))
    c.push(DOUBLE_HEIGHT)
    c.push(enc(`LEVEREN: ${orderData.requestedDateTime}`))
    c.push(NORMAL_SIZE)
  }

  c.push(Buffer.from('\n', 'latin1'))
  c.push(Buffer.from(sep, 'latin1'))

  // ===== KLANTGEGEVENS =====
  c.push(ALIGN_LEFT)
  if (orderData?.customerName) {
    c.push(DOUBLE_HEIGHT)
    c.push(enc(`Klant: ${orderData.customerName}`))
    c.push(NORMAL_SIZE)
  }
  if (orderData?.customerPhone) c.push(enc(`Tel: ${orderData.customerPhone}`))
  if (orderData?.customerAddress) c.push(enc(`Adres: ${orderData.customerAddress}`))

  // Aankomsttijd / hoe lang geleden de bestelling binnenkwam
  const now = new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
  c.push(enc(`Tijd: ${now}`))

  c.push(Buffer.from('\n', 'latin1'))
  c.push(Buffer.from(sep, 'latin1'))

  // ===== ITEMS — TE BEREIDEN =====
  c.push(ALIGN_CENTER)
  c.push(enc('TE BEREIDEN'))
  c.push(ALIGN_LEFT)
  c.push(Buffer.from(sepThin, 'latin1'))

  for (const item of (orderData?.items || [])) {
    const qty = parseNumber(item.quantity) || 1
    const name = item.name || 'Item'

    // Naam in DOUBLE_HEIGHT — net als de tegels op het scherm
    c.push(DOUBLE_HEIGHT)
    c.push(enc(`${qty}x ${name}`))
    c.push(NORMAL_SIZE)

    // Opties — ook DOUBLE_HEIGHT zoals het scherm ze toont met "+"
    const choices = item.choices || item.options || []
    for (const ch of choices) {
      const cn = ch.name || ch.optionName || ''
      if (!cn) continue
      c.push(DOUBLE_HEIGHT)
      c.push(enc(`  + ${cn}`))
      c.push(NORMAL_SIZE)
    }

    // Item-specifieke opmerking ("zonder ui", etc.)
    if (item.notes) {
      c.push(DOUBLE_HEIGHT)
      c.push(enc(`  ! ${item.notes}`))
      c.push(NORMAL_SIZE)
    }

    c.push(Buffer.from(sepThin, 'latin1'))
  }

  // ===== KLANT-OPMERKING (algemeen) =====
  if (orderData?.customerNotes) {
    c.push(Buffer.from('\n', 'latin1'))
    c.push(ALIGN_CENTER)
    c.push(DOUBLE_HEIGHT)
    c.push(enc('!! OPMERKING !!'))
    c.push(NORMAL_SIZE)
    c.push(ALIGN_LEFT)
    c.push(DOUBLE_HEIGHT)
    c.push(enc(String(orderData.customerNotes)))
    c.push(NORMAL_SIZE)
    c.push(Buffer.from(sep, 'latin1'))
  }

  // ===== FOOTER (klein) =====
  const bizName = (businessInfo?.name || winkelnaam || '').toString().trim()
  if (bizName) {
    c.push(Buffer.from('\n', 'latin1'))
    c.push(ALIGN_CENTER)
    c.push(enc(bizName))
    if (businessInfo?.phone) c.push(enc(`Tel: ${businessInfo.phone}`))
  }

  c.push(NORMAL_SIZE)
  c.push(BOLD_OFF)
  c.push(EMPHASIZE_OFF)
  c.push(LINE_SPACING_N)
  c.push(feedDots(160))
  c.push(feedDots(80))
  c.push(CUT_PARTIAL)

  return Buffer.concat(c)
}

function buildEscPosPayload(body) {
  // Keuken-bon mode (geen prijzen, alleen items + notities)
  if (body && body.receiptMode === 'keuken') return buildKitchenReceipt(body)
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
  c.push(CODEPAGE_PC437)
  c.push(EMPHASIZE_ON)
  c.push(BOLD_ON)
  c.push(LINE_SPACING_W)

  // Header: bedrijfsnaam centered. Lange namen (>18 chars) krijgen
  // alleen DOUBLE_HEIGHT zodat ze niet over 2 regels breken in DOUBLE_SIZE.
  c.push(Buffer.from('\n', 'latin1'))
  c.push(ALIGN_CENTER)
  const title = (body?.winkelnaam || body?.storeName || 'RECEIPT').toString().trim()
  if (title.length > 18) {
    c.push(DOUBLE_HEIGHT)
  } else {
    c.push(DOUBLE_SIZE)
  }
  c.push(enc(title))
  c.push(NORMAL_SIZE)
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

    // De regel zelf — € / EUR / korte E worden ASCII "EUR " (Chinese printers veilig)
    c.push(encWithEuro(line))

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

  /**
   * Cutter-offset compensatie: 30 mm totaal feed → ~15 mm zichtbare ruimte
   * ONDER 'Bedankt' op een typische Epson TM.
   */
  c.push(feedDots(160)) // 20 mm
  c.push(feedDots(80))  // + 10 mm
  c.push(CUT_PARTIAL)
  return Buffer.concat(c)
}

/**
 * Encode plaatetekst‑regels: €, EUR en korte **E** vóór bedrag → ASCII **"EUR "**
 * zodat Chinees/GBK‑firmware geen Han‑glyphe toont waar PC858 byte 0xD5 (=€) fout zou interpreteren.
 * Han‑regels: strengere **E**→EUR (alleen met ,xx/.xx).
 */
function encWithEuro(line) {
  const s = (line ?? '').toString()
  let replaced = s.replace(/€\s*/g, 'EUR ')
  if (/\p{Script=Han}/u.test(s)) {
    replaced = replaced.replace(/(^|[\s(])E(?=\s*-?\d+[.,]\d{2})/g, '$1EUR ')
  } else {
    replaced = replaced.replace(/(^|[\s(])E(?=\s?-?\d)/g, '$1EUR ')
  }
  replaced = replaced.replace(/(EUR\s*){2,}/gi, 'EUR ')
  replaced = replaced.replace(/  +/g, ' ')
  return Buffer.concat([encInline(replaced), Buffer.from([0x0a])])
}

/**
 * Smoke/regressie: ASCII "EUR" op bon, géén PC858‑eurobyte 0xD5 in tekst‑payload (GBK/Chinees).
 * CI of release: `VYSION_PRINT_AGENT_ENC_TEST=1 node -e "require('./server.js')"` vanuit deze map.
 */
;(function encWithEuroRegressionSmoke() {
  if (process.env.VYSION_PRINT_AGENT_ENC_TEST !== '1') return
  const assert = require('assert')
  const needle = Buffer.from('EUR', 'latin1')
  const hasEurAscii = (buf) => Buffer.isBuffer(buf) && buf.includes(needle)
  const noD5InUserText = (buf) => {
    const i = Buffer.from(buf).indexOf(0xd5)
    return i < 0
  }
  assert(hasEurAscii(encWithEuro('Totaal E12,50')), 'Latijn: E12,50→EUR')
  assert(hasEurAscii(encWithEuro('Code E250')), 'Latijn: E250→EUR')
  assert(hasEurAscii(encWithEuro('1x Friet  EUR 2.50')), 'EUR in regel')
  assert(!hasEurAscii(encWithEuro('Alleen tekst zonder geld')), 'Geen valse EUR')
  assert(!hasEurAscii(encWithEuro('红牛饮料 E250')), 'Han: E250 geen valuta')
  assert(hasEurAscii(encWithEuro('红牛 EUR 3,50')), 'Han: EUR')
  assert(hasEurAscii(encWithEuro('套餐 E 9,99')), 'Han: E met decimalen→EUR')
  /** Rijke bon: prijsregels bevatten ASCII EUR */
  const rich = buildEscPosPayload({
    receiptMode: 'kassa',
    winkelnaam: 'Testzaak',
    orderData: {
      orderNumber: 99,
      orderType: 'TAKEAWAY',
      items: [{ quantity: 2, name: 'Friet', price: 6.0 }],
      subtotal: 4.96,
      tax: 1.04,
      total: 6,
      paymentMethod: 'CARD',
    },
    businessInfo: { name: 'Testzaak', vatRate: 21 },
  })
  assert(hasEurAscii(rich), 'Rich receipt: EUR‑ASCII')
  assert(noD5InUserText(rich), 'Rich receipt: géén 0xD5‑euroglyphe (Chinese firmware)')
  const noEscJHighN = (buf) => {
    for (let i = 0; i + 2 < buf.length; i++) {
      if (buf[i] === 0x1b && buf[i + 1] === 0x4a && buf[i + 2] >= 0x80) return false
    }
    return true
  }
  assert(noEscJHighN(rich), 'Rich receipt: ESC J n altijd < 128 (GBK‑sync)')
  // eslint-disable-next-line no-console -- bewust bij selftest
  console.log('[print-agent] encWithEuro regression smoke: OK')
})()

function getScriptPath(scriptName) {
  try {
    const { app } = require('electron')
    if (app?.isPackaged && process.resourcesPath) {
      const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', scriptName)
      if (fs.existsSync(unpacked)) return unpacked
    }
  } catch {
    /* niet-Electron context */
  }
  return path.join(__dirname, scriptName)
}

function getPrintScriptPath() { return getScriptPath('print-raw.ps1') }
function getDrawerScriptPath() { return getScriptPath('open-drawer.ps1') }

/** Open de kassa-lade via PASSTHROUGH-escape (GDI) + RAW-write fallback.
 *  Werkt op Epson APD die normale RAW drawer-bytes filtert. */
function openCashDrawerWindows(printerName) {
  const ps1 = getDrawerScriptPath()
  if (!fs.existsSync(ps1)) {
    return { ok: false, error: 'open-drawer.ps1 niet gevonden.' }
  }
  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-PrinterName', printerName],
    { encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 8000, windowsHide: true }
  )
  if (r.error) return { ok: false, error: String(r.error.message || r.error) }
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`
    return { ok: false, error: err }
  }
  return { ok: true, info: (r.stdout || '').trim() }
}

/**
 * Start ladekick **parallel** aan de eerste bon — geen `spawnSync` (dat blokkeerde seconden tot de printer ook begon).
 * Fouten alleen naar console; synchrone `/drawer`-route gebruikt nog `openCashDrawerWindows`.
 */
function kickCashDrawerWindowsParallel(printerName) {
  const ps1 = getDrawerScriptPath()
  if (!fs.existsSync(ps1)) {
    console.error('[drawer] parallel kick: open-drawer.ps1 niet gevonden')
    return
  }
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-PrinterName', printerName],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let errBuf = ''
  child.stderr?.on('data', (d) => {
    errBuf += String(d)
    if (errBuf.length > 2000) errBuf = errBuf.slice(-2000)
  })
  child.on('error', (e) => console.error('[drawer] parallel kick spawn →', e))
  child.on('close', (code) => {
    if (code !== 0) {
      console.error('[drawer] parallel kick niet OK (exit', `${code})`, errBuf.trim() || '(geen stderr)')
    }
  })
}

/**
 * Stuurt RAW ESC/POS bytes naar een Windows-printer met automatische retry.
 *
 *   1) Als attempt 1 faalt en de fout lijkt op "printer offline" of timeout
 *      → wacht 800ms, probeer opnieuw met ESC @ (init) gependeld vooraan
 *      zodat een hangende printer-buffer reset wordt
 *   2) Tot maximaal 3 attempts, daarna ok=false
 *
 * Dit voorkomt dat 1 hapering (briefly disconnect, kabel-storing) een hele
 * bestelling laat stuksluipen.
 */
function printRawWindows(printerName, payloadBuffer, attempt = 1) {
  const ps1 = getPrintScriptPath()
  if (!fs.existsSync(ps1)) {
    return { ok: false, error: 'print-raw.ps1 niet gevonden (installatie corrupt).' }
  }
  // Bij retry: prepend ESC @ zodat printer-firmware-buffer leeg start.
  const buf = attempt === 1
    ? payloadBuffer
    : Buffer.concat([Buffer.from([0x1b, 0x40]), payloadBuffer])

  const b64 = buf.toString('base64')
  const rand = crypto.randomBytes(8).toString('hex')
  const tmpFile = path.join(os.tmpdir(), `vysion-raw-${process.pid}-${Date.now()}-${rand}.b64`)
  try {
    fs.writeFileSync(tmpFile, b64, 'utf8')
    const r = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-PrinterName', printerName, '-Base64Path', tmpFile],
      { encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024, timeout: 15000, windowsHide: true }
    )
    if (r.error) {
      const errMsg = String(r.error.message || r.error)
      if (attempt < 3) {
        console.warn(`[print] attempt ${attempt} fout: ${errMsg} — retry…`)
        // 800ms wachten zodat USB-spool-driver kan recoveren
        const end = Date.now() + 800
        while (Date.now() < end) { /* sync wait */ }
        return printRawWindows(printerName, payloadBuffer, attempt + 1)
      }
      return { ok: false, error: errMsg, attempts: attempt }
    }
    if (r.status !== 0) {
      const errOut = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`
      if (attempt < 3) {
        console.warn(`[print] attempt ${attempt} status ${r.status}: ${errOut} — retry…`)
        const end = Date.now() + 800
        while (Date.now() < end) { /* sync wait */ }
        return printRawWindows(printerName, payloadBuffer, attempt + 1)
      }
      return { ok: false, error: errOut, attempts: attempt }
    }
    if (attempt > 1) console.info(`[print] gelukt na retry ${attempt}`)
    return { ok: true, attempts: attempt }
  } finally {
    try { fs.unlinkSync(tmpFile) } catch { /* ignore */ }
  }
}

/** Pauze tussen twee bonkopieën USB/RAW — te kort geeft spool-fouten; te lang voelt als traag gedrag aan de kassa. */
const INTER_RECEIPT_COPY_PAUSE_MS = 560

/**
 * Eén ESC/POS-aanvraag: hoofdprinter (zaak/bar) + optioneel tweede keukenprinter.
 * @param {Record<string, unknown>} body - JSON zoals POST /print
 * @param {{ printerName?: string|null, kitchenPrinterName?: string|null }} cfg
 * @returns {{ ok: boolean, error?: string, printedCopies: number, buddyPrinted: boolean, kitchenFailOnly?: boolean, payload?: Buffer, copies?: number, orderLabel?: string }}
 */
function executePrintRequest(body, cfg) {
  const primary = cfg.printerName && String(cfg.printerName).trim() ? String(cfg.printerName).trim() : null
  const kitchenPnRaw = cfg.kitchenPrinterName ? String(cfg.kitchenPrinterName).trim() : ''
  const kitchenPn = kitchenPnRaw || ''

  const b = body && typeof body === 'object' ? body : {}

  const receiptMode = b.receiptMode === 'keuken' ? 'keuken' : 'kassa'

  if (!primary) {
    return { ok: false, error: 'Geen hoofdprinter (zaak/bar) gekozen.', printedCopies: 0, buddyPrinted: false }
  }

  /** Keukenb-only op tweede apparaten; zoniet op hoofdprinter. */
  const targetPrinter =
    receiptMode === 'keuken' && kitchenPn && kitchenPn !== primary ? kitchenPn : primary

  const companionKitchen = b.companionKitchen !== false
  /** Na volledige kassabon: automatisch ook keukenbon op keukenprinter (indien ingesteld). */
  const wantBuddyKitchen =
    receiptMode === 'kassa' &&
    companionKitchen &&
    kitchenPn !== '' &&
    kitchenPn !== primary

  const payloadMain = buildEscPosPayload({ ...b, receiptMode })

  const copies =
    typeof b.copies === 'number' && b.copies >= 1 ? Math.min(Math.max(Math.floor(b.copies), 1), 5) : 2
  const wantDrawer = b.openDrawer === true

  const orderLabel = b.orderData?.orderNumber
    ? `bon #${b.orderData.orderNumber}`
    : receiptMode === 'keuken'
      ? 'keukenbon'
      : 'kassabon'

  let printedCount = 0
  let lastError = null

  for (let i = 0; i < copies; i++) {
    if (wantDrawer && i === 0 && receiptMode === 'kassa') {
      kickCashDrawerWindowsParallel(primary)
    }
    const result = printRawWindows(targetPrinter, payloadMain)
    if (!result.ok) {
      lastError = result.error || 'Print mislukt'
      console.error(`[print] copy ${i + 1}/${copies} (${targetPrinter}) →`, lastError)

      /** Totale kopieën die nog gedrukt moeten worden; alleen naar wachtrij als er nog géén kopie lukte. */
      const remaining = copies - i
      return {
        ok: false,
        error: lastError,
        printedCopies: printedCount,
        buddyPrinted: false,
        ...(printedCount === 0
          ? { payload: payloadMain, copies: remaining, orderLabel: `${orderLabel} (kopieën)` }
          : {}),
      }
    }
    printedCount++
    if (i < copies - 1) sleepSyncMs(INTER_RECEIPT_COPY_PAUSE_MS)
  }

  let buddyPrinted = false
  if (wantBuddyKitchen && printedCount === copies) {
    sleepSyncMs(INTER_RECEIPT_COPY_PAUSE_MS)
    const kitchenPayload = buildEscPosPayload({ ...b, receiptMode: 'keuken' })
    const kr = printRawWindows(kitchenPn, kitchenPayload)
    if (!kr.ok) {
      console.error('[print] companion keuken →', kr.error)
      return {
        ok: false,
        error:
          typeof kr.error === 'string' ? `Kassa ok, keuken: ${kr.error}` : `Kassa ok, keukenprint mislukt.`,
        printedCopies: printedCount,
        buddyPrinted: false,
        kitchenFailOnly: true,
      }
    }
    buddyPrinted = true
  }

  return { ok: true, printedCopies: printedCount, buddyPrinted }
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

function createApp(
  getPrintConfig /* () => { printerName: string|null, kitchenPrinterName?: string|null } */,
  hooks = {},
) {
  const onOpenSettings = typeof hooks.onOpenSettings === 'function' ? hooks.onOpenSettings : null
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
    const c = getPrintConfig() || {}
    const name = c.printerName && String(c.printerName).trim() ? String(c.printerName).trim() : null
    const k = c.kitchenPrinterName && String(c.kitchenPrinterName).trim() ? String(c.kitchenPrinterName).trim() : null
    res.json({
      ok: true,
      service: 'vysion-print-agent',
      printerConfigured: !!name,
      printerName: name || null,
      kitchenPrinterName: k || null,
    })
  })

  app.post('/open-settings', (_req, res) => {
    if (!onOpenSettings) {
      return res.status(501).json({ ok: false, error: 'Instellingen alleen via Vysion Kassa-app.' })
    }
    try {
      onOpenSettings()
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.get('/printers', (_req, res) => {
    try {
      const printers = listWindowsPrintersSync()
      res.json({ ok: true, printers })
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.post('/drawer', (_req, res) => {
    const cfg = getPrintConfig() || {}
    const printerName =
      cfg.printerName && String(cfg.printerName).trim() ? String(cfg.printerName).trim() : null
    if (!printerName) {
      return res.status(400).json({ success: false, error: 'Geen printer geconfigureerd.' })
    }
    try {
      // Gebruik PASSTHROUGH-escape (werkt op Epson APD); fallback in script naar RAW.
      const r = openCashDrawerWindows(printerName)
      if (!r.ok) {
        console.error('[drawer] →', r.error)
        return res.status(500).json({ success: false, error: r.error })
      }
      return res.json({ success: true, info: r.info })
    } catch (e) {
      return res.status(500).json({ success: false, error: String(e?.message || e) })
    }
  })

  app.post('/print', (req, res) => {
    const cfg =
      typeof getPrintConfig === 'function'
        ? getPrintConfig()
        : { printerName: null, kitchenPrinterName: null }
    const printerName =
      cfg && cfg.printerName && String(cfg.printerName).trim() ? String(cfg.printerName).trim() : null
    if (!printerName) {
      return res.status(400).json({
        success: false,
        error: 'Geen printer gekozen. Open Vysion Print Agent → Instellingen.',
      })
    }
    try {
      const body = req.body || {}
      const wantDrawer = body.openDrawer === true
      const r = executePrintRequest(body, {
        printerName: cfg.printerName,
        kitchenPrinterName: cfg.kitchenPrinterName,
      })
      const copiesAsked =
        typeof body.copies === 'number' && body.copies >= 1
          ? Math.min(Math.max(Math.floor(body.copies), 1), 5)
          : 2

      if (r.ok) {
        return res.json({
          success: true,
          message: 'OK',
          copies: r.printedCopies,
          drawer: wantDrawer,
          buddyPrinted: r.buddyPrinted || false,
        })
      }

      if (r.kitchenFailOnly) {
        return res.status(207).json({
          success: false,
          kitchenFailOnly: true,
          buddyPrinted: false,
          error: r.error || 'Keukenprint mislukt',
          printed: r.printedCopies,
          requestedCopies: copiesAsked,
        })
      }

      return res.status(500).json({
        success: false,
        error: r.error || 'Print mislukt',
        printed: r.printedCopies,
        requested: copiesAsked,
      })
    } catch (e) {
      console.error('[print] exception', e)
      return res.status(500).json({ success: false, error: String(e?.message || e) })
    }
  })

  return app
}

function startServer(getPrintConfig, port = 9742, hooks = {}) {
  const app = createApp(getPrintConfig, hooks)
  const srv = app.listen(port, '127.0.0.1', () => {
    console.log(`Vysion Print Agent luistert op http://127.0.0.1:${port}`)
  })
  // Robuuster: bij EADDRINUSE niet crashen — log netjes en blijf draaien zonder
  // server (de IPC-bridge in main.js werkt nog wel voor de Electron-kassa).
  srv.on('error', (e) => {
    if (e && e.code === 'EADDRINUSE') {
      console.error(`[server] poort ${port} reeds in gebruik door andere instance.`)
    } else {
      console.error('[server] error', e)
    }
  })
  return srv
}

module.exports = {
  createApp,
  startServer,
  executePrintRequest,
  buildEscPosPayload,
  encInline,
  printRawWindows,
  openCashDrawerWindows,
  kickCashDrawerWindowsParallel,
  listWindowsPrintersSync,
  sleepSyncMs,
  DRAWER_KICK,
}
