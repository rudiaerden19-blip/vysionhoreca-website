/** Alleen TD80. Epson/Star laden dit bestand niet. */
const QRCode = require('./vendor/qrcode-core/qrcode')

const ESC = 0x1b
const GS = 0x1d

function moduleGrid(url) {
  const qr = QRCode.create(String(url), { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const quiet = 2
  const scale = 6
  const dim = (n + quiet * 2) * scale
  const dots = []
  for (let y = 0; y < dim; y++) {
    const row = []
    const my = Math.floor(y / scale) - quiet
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale) - quiet
      row.push(mx >= 0 && mx < n && my >= 0 && my < n && !!qr.modules.get(mx, my))
    }
    dots.push(row)
  }
  return { dots, dim }
}

/** ESC * 24-dot — werkt op Chinese TD80 die GS v 0 / GS ( k negeren. */
function toEscStar({ dots, dim }) {
  const parts = []
  for (let y0 = 0; y0 < dim; y0 += 24) {
    const cols = []
    for (let x = 0; x < dim; x++) {
      let b0 = 0
      let b1 = 0
      let b2 = 0
      for (let b = 0; b < 8; b++) {
        if (y0 + b < dim && dots[y0 + b][x]) b0 |= 0x80 >> b
        if (y0 + 8 + b < dim && dots[y0 + 8 + b][x]) b1 |= 0x80 >> b
        if (y0 + 16 + b < dim && dots[y0 + 16 + b][x]) b2 |= 0x80 >> b
      }
      cols.push(b0, b1, b2)
    }
    parts.push(Buffer.from([ESC, 0x2a, 0x21, dim & 0xff, (dim >> 8) & 0xff]))
    parts.push(Buffer.from(cols))
    parts.push(Buffer.from([ESC, 0x4a, 24]))
  }
  return Buffer.concat(parts)
}

function buildTd80QrImage(url) {
  const u = String(url || '').trim()
  if (!u) return Buffer.alloc(0)
  try {
    return toEscStar(moduleGrid(u))
  } catch (e) {
    console.warn('[td80-qr]', e && e.message ? e.message : e)
    return Buffer.alloc(0)
  }
}

module.exports = { buildTd80QrImage }
