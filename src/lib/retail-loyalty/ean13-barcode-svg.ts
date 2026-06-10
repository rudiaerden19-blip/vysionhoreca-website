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

export function buildEan13BarcodeSvg(
  code13: string,
  options?: { barHeight?: number; moduleWidth?: number },
): string | null {
  const bits = encodeEan13Modules(code13)
  if (!bits) return null
  const module = options?.moduleWidth ?? 2
  const barH = options?.barHeight ?? 72
  const quiet = 10 * module
  const width = bits.length * module + quiet * 2
  const height = barH + 24
  let x = quiet
  const rects: string[] = []
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects.push(
        `<rect x="${x}" y="0" width="${module}" height="${barH}" fill="#000"/>`,
      )
    }
    x += module
  }
  const label = code13.replace(/\D/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="EAN ${label}"><g>${rects.join('')}</g><text x="${width / 2}" y="${barH + 18}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="14" fill="#111">${label}</text></svg>`
}
