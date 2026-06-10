/** EAN-13 streepjescode (SVG) voor winkelpas op telefoon — scanners lezen dezelfde 899… code als in de kassa. */

const L: Record<string, string> = {
  '0': '0001101',
  '1': '0011001',
  '2': '0010011',
  '3': '0111101',
  '4': '0100011',
  '5': '0110001',
  '6': '0101111',
  '7': '0111011',
  '8': '0110111',
  '9': '0001011',
}

const G: Record<string, string> = {
  '0': '0100111',
  '1': '0110011',
  '2': '0011011',
  '3': '0100001',
  '4': '0011101',
  '5': '0111001',
  '6': '0000101',
  '7': '0010001',
  '8': '0001001',
  '9': '0010111',
}

const R: Record<string, string> = {
  '0': '1110010',
  '1': '1100110',
  '2': '1101100',
  '3': '1000010',
  '4': '1011100',
  '5': '1001110',
  '6': '1010000',
  '7': '1000100',
  '8': '1001000',
  '9': '1110100',
}

/** Eerste cijfer EAN-13 → L/G patroon voor cijfers 2–7 */
const PARITY: string[] = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
]

export function ean13CheckDigit(twelveDigits: string): string {
  const d = twelveDigits.replace(/\D/g, '')
  if (d.length !== 12) return '0'
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const n = Number(d[i])
    sum += i % 2 === 0 ? n : n * 3
  }
  return String((10 - (sum % 10)) % 10)
}

function encodeEan13Modules(digits13: string): string | null {
  const d = digits13.replace(/\D/g, '')
  if (d.length !== 13) return null
  const first = Number(d[0])
  if (Number.isNaN(first) || first < 0 || first > 9) return null
  const parity = PARITY[first]
  let bits = '101'
  for (let i = 1; i <= 6; i++) {
    const ch = d[i]
    const mode = parity[i - 1]
    if (mode === 'L') bits += L[ch] ?? ''
    else bits += G[ch] ?? ''
  }
  bits += '01010'
  for (let i = 7; i <= 12; i++) {
    bits += R[d[i]] ?? ''
  }
  bits += '101'
  if (bits.length !== 95 || /[^01]/.test(bits)) return null
  return bits
}

/** E-mailclients tonen geen SVG; HTML-tabel met zwarte strepen scant hetzelfde als EAN-13. */
export function buildEan13BarcodeEmailHtml(
  code13: string,
  options?: { barHeightPx?: number; moduleWidthPx?: number },
): string | null {
  const bits = encodeEan13Modules(code13)
  if (!bits) return null
  const moduleW = options?.moduleWidthPx ?? 3
  const barH = options?.barHeightPx ?? 80
  const quiet = 10
  const cells: string[] = []
  for (let i = 0; i < quiet; i++) {
    cells.push(
      `<td style="width:${moduleW}px;height:${barH}px;background:#ffffff;font-size:0;line-height:0;">&#8203;</td>`,
    )
  }
  for (let i = 0; i < bits.length; i++) {
    const bg = bits[i] === '1' ? '#000000' : '#ffffff'
    cells.push(
      `<td style="width:${moduleW}px;height:${barH}px;background:${bg};font-size:0;line-height:0;">&#8203;</td>`,
    )
  }
  for (let i = 0; i < quiet; i++) {
    cells.push(
      `<td style="width:${moduleW}px;height:${barH}px;background:#ffffff;font-size:0;line-height:0;">&#8203;</td>`,
    )
  }
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;border-collapse:collapse;"><tr>${cells.join('')}</tr></table>`
}

export function buildEan13BarcodeSvg(
  code13: string,
  options?: { barHeight?: number; moduleWidth?: number; showCodeText?: boolean },
): string | null {
  const bits = encodeEan13Modules(code13)
  if (!bits) return null
  const modulePx = options?.moduleWidth ?? 2
  const barH = options?.barHeight ?? 72
  const showCodeText = options?.showCodeText !== false
  const quiet = 10 * modulePx
  const width = bits.length * modulePx + quiet * 2
  const textBand = showCodeText ? 24 : 0
  const height = barH + textBand
  let x = quiet
  const rects: string[] = []
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects.push(
        `<rect x="${x}" y="0" width="${modulePx}" height="${barH}" fill="#000"/>`,
      )
    }
    x += modulePx
  }
  const label = code13.replace(/\D/g, '')
  const textEl = showCodeText
    ? `<text x="${width / 2}" y="${barH + 18}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="14" fill="#111">${label}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="EAN ${label}"><g>${rects.join('')}</g>${textEl}</svg>`
}
