const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

/** ESC @ — printer initialiseert. */
export function escInit(): Buffer {
  return Buffer.from([ESC, 0x40])
}

/** Tekst als Latin-1 (West-Europees op veel Epson TM’s bruikbaar). */
export function escText(lines: string[]): Buffer {
  return Buffer.concat(
    lines.map((line) => Buffer.concat([Buffer.from(line + '\n', 'latin1'), Buffer.from([LF])])),
  )
}

/** Volledige afsnede ( veel thermische Epson’s ondersteunen deze variant ). */
export function escFullCut(): Buffer {
  return Buffer.from([GS, 0x56, 0x00])
}

export function escFeedLines(n: number): Buffer {
  const count = Math.max(1, Math.min(255, n))
  return Buffer.from([ESC, 0x64, count])
}

export function buildTestReceipt(extraLines?: string[]): Buffer {
  const now = new Date().toISOString()
  const body = escText([
    'Vysion · Epson USB testbon',
    '-------------------------------',
    `UTC: ${now}`,
    ...(extraLines ?? []),
    ' ',
    'Als dit leesbaar is, werkt ESC/P naar USB.',
  ])
  return Buffer.concat([escInit(), body, escFeedLines(4), escFullCut()])
}
