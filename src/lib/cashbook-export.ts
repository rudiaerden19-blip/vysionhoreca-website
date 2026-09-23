import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import * as XLSX from 'xlsx'
import { formatEuroFromCents, type CashbookRangeRow } from '@/lib/cashbook-store'

export type CashbookExportMeta = {
  businessName: string
  btwNumber: string
  address: string
  periodLabel: string
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function csvLine(cells: unknown[]): string {
  return cells.map(csvCell).join(';')
}

function rateTax(row: CashbookRangeRow, rate: number): number {
  return row.vat.find((line) => line.rate === rate)?.taxCents || 0
}

function sumBy(rows: CashbookRangeRow[], pick: (row: CashbookRangeRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0)
}

function sumKnown(rows: CashbookRangeRow[], pick: (row: CashbookRangeRow) => number | null): number | null {
  const values = rows.map(pick).filter((value): value is number => value != null)
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0)
}

function euroOrBlank(cents: number | null): string {
  return cents == null ? '' : formatEuroFromCents(cents)
}

function boldTotalRow(buffer: Buffer): Buffer {
  const files = unzipSync(new Uint8Array(buffer))
  const stylesKey = 'xl/styles.xml'
  const sheetKey = 'xl/worksheets/sheet1.xml'
  let styles = strFromU8(files[stylesKey])
  const fontCount = Number(styles.match(/<fonts count="(\d+)">/)?.[1] || 1)
  const styleCount = Number(styles.match(/<cellXfs count="(\d+)">/)?.[1] || 1)
  styles = styles.replace(/<fonts count="\d+">/, `<fonts count="${fontCount + 1}">`)
  styles = styles.replace(
    '</fonts>',
    '<font><b/><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>',
  )
  styles = styles.replace(/<cellXfs count="\d+">/, `<cellXfs count="${styleCount + 1}">`)
  styles = styles.replace(
    '</cellXfs>',
    `<xf numFmtId="0" fontId="${fontCount}" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>`,
  )
  let sheet = strFromU8(files[sheetKey])
  sheet = sheet.replace(/<row r="\d+"[^>]*>(?:(?!<\/row>)[\s\S])*?<v>Totaal<\/v>[\s\S]*?<\/row>/, (row) => row.replace(/<c /g, `<c s="${styleCount}" `))
  files[stylesKey] = strToU8(styles)
  files[sheetKey] = strToU8(sheet)
  return Buffer.from(zipSync(files))
}

export function buildCashbookCsv(meta: CashbookExportMeta, rows: CashbookRangeRow[]): string {
  const lines = [
    csvLine(['Zaak', meta.businessName]),
    csvLine(['BTW', meta.btwNumber]),
    csvLine(['Vestiging', meta.address]),
    csvLine(['Periode', meta.periodLabel]),
    '',
    csvLine(['Datum', 'Status', 'Bruto', 'Excl. btw', 'Btw', 'Cash', 'Terminal', 'Online', 'Kortingen', 'Retouren', 'Beginkas', 'Verwacht', 'Geteld', 'Verschil', 'Correcties']),
    ...rows.map((row) =>
      csvLine([
        row.date,
        row.status,
        formatEuroFromCents(row.grossCents),
        formatEuroFromCents(row.exclCents),
        formatEuroFromCents(row.taxCents),
        formatEuroFromCents(row.cashCents),
        formatEuroFromCents(row.cardCents),
        formatEuroFromCents(row.onlineCents),
        formatEuroFromCents(row.discountCents),
        formatEuroFromCents(row.refundCents),
        formatEuroFromCents(row.openingCents),
        row.expectedCents == null ? '' : formatEuroFromCents(row.expectedCents),
        row.countedCents == null ? '' : formatEuroFromCents(row.countedCents),
        row.differenceCents == null ? '' : formatEuroFromCents(row.differenceCents),
        row.adjustmentCount,
      ]),
    ),
    csvLine([
      'Totaal',
      '',
      formatEuroFromCents(sumBy(rows, (row) => row.grossCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.exclCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.taxCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.cashCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.cardCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.onlineCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.discountCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.refundCents)),
      '',
      '',
      '',
      euroOrBlank(sumKnown(rows, (row) => row.differenceCents)),
      sumBy(rows, (row) => row.adjustmentCount),
    ]),
  ]
  return lines.join('\n')
}

export function buildBoekhoudingCsv(meta: CashbookExportMeta, rows: CashbookRangeRow[]): string {
  const lines = [
    csvLine(['Zaak', meta.businessName]),
    csvLine(['BTW', meta.btwNumber]),
    csvLine(['Periode', meta.periodLabel]),
    '',
    csvLine([
      'Datum',
      'Dagnummer',
      'Bruto omzet',
      'Netto omzet',
      'Btw 0%',
      'Btw 6%',
      'Btw 9%',
      'Btw 12%',
      'Btw 21%',
      'Cash',
      'Terminal',
      'Online',
      'Retouren',
      'Correcties',
      'Kasverschil',
    ]),
    ...rows.map((row) =>
      csvLine([
        row.date,
        row.date.replace(/-/g, ''),
        formatEuroFromCents(row.grossCents),
        formatEuroFromCents(row.exclCents),
        formatEuroFromCents(rateTax(row, 0)),
        formatEuroFromCents(rateTax(row, 6)),
        formatEuroFromCents(rateTax(row, 9)),
        formatEuroFromCents(rateTax(row, 12)),
        formatEuroFromCents(rateTax(row, 21)),
        formatEuroFromCents(row.cashCents),
        formatEuroFromCents(row.cardCents),
        formatEuroFromCents(row.onlineCents),
        formatEuroFromCents(row.refundCents),
        row.adjustmentCount,
        row.differenceCents == null ? '' : formatEuroFromCents(row.differenceCents),
      ]),
    ),
    csvLine([
      'Totaal',
      '',
      formatEuroFromCents(sumBy(rows, (row) => row.grossCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.exclCents)),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 0))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 6))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 9))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 12))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 21))),
      formatEuroFromCents(sumBy(rows, (row) => row.cashCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.cardCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.onlineCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.refundCents)),
      sumBy(rows, (row) => row.adjustmentCount),
      euroOrBlank(sumKnown(rows, (row) => row.differenceCents)),
    ]),
  ]
  return lines.join('\n')
}

export function renderBoekhoudingXlsx(meta: CashbookExportMeta, rows: CashbookRangeRow[]): Buffer {
  const sheetRows = [
    ['Zaak', meta.businessName],
    ['BTW', meta.btwNumber],
    ['Periode', meta.periodLabel],
    [],
    ['Datum', 'Dagnummer', 'Bruto omzet', 'Netto omzet', 'Btw 0%', 'Btw 6%', 'Btw 9%', 'Btw 12%', 'Btw 21%', 'Cash', 'Terminal', 'Online', 'Retouren', 'Correcties', 'Kasverschil'],
    ...rows.map((row) => [
      row.date,
      row.date.replace(/-/g, ''),
      formatEuroFromCents(row.grossCents),
      formatEuroFromCents(row.exclCents),
      formatEuroFromCents(rateTax(row, 0)),
      formatEuroFromCents(rateTax(row, 6)),
      formatEuroFromCents(rateTax(row, 9)),
      formatEuroFromCents(rateTax(row, 12)),
      formatEuroFromCents(rateTax(row, 21)),
      formatEuroFromCents(row.cashCents),
      formatEuroFromCents(row.cardCents),
      formatEuroFromCents(row.onlineCents),
      formatEuroFromCents(row.refundCents),
      row.adjustmentCount,
      euroOrBlank(row.differenceCents),
    ]),
    [
      'Totaal',
      '',
      formatEuroFromCents(sumBy(rows, (row) => row.grossCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.exclCents)),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 0))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 6))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 9))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 12))),
      formatEuroFromCents(sumBy(rows, (row) => rateTax(row, 21))),
      formatEuroFromCents(sumBy(rows, (row) => row.cashCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.cardCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.onlineCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.refundCents)),
      sumBy(rows, (row) => row.adjustmentCount),
      euroOrBlank(sumKnown(rows, (row) => row.differenceCents)),
    ],
  ]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheetRows), 'Boekhouding')
  const raw = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return boldTotalRow(raw)
}

export function renderCashbookXlsx(meta: CashbookExportMeta, rows: CashbookRangeRow[]): Buffer {
  const sheetRows = rows.map((row) => ({
    Datum: row.date,
    Zaak: meta.businessName,
    Bruto: formatEuroFromCents(row.grossCents),
    'Excl. btw': formatEuroFromCents(row.exclCents),
    Btw: formatEuroFromCents(row.taxCents),
    Cash: formatEuroFromCents(row.cashCents),
    Terminal: formatEuroFromCents(row.cardCents),
    Online: formatEuroFromCents(row.onlineCents),
    Beginkas: formatEuroFromCents(row.openingCents),
    Verwacht: row.expectedCents == null ? '' : formatEuroFromCents(row.expectedCents),
    Geteld: row.countedCents == null ? '' : formatEuroFromCents(row.countedCents),
    Verschil: row.differenceCents == null ? '' : formatEuroFromCents(row.differenceCents),
    Correcties: row.adjustmentCount,
    Status: row.status,
  }))
  sheetRows.push({
    Datum: 'Totaal',
    Zaak: meta.businessName,
    Bruto: formatEuroFromCents(sumBy(rows, (row) => row.grossCents)),
    'Excl. btw': formatEuroFromCents(sumBy(rows, (row) => row.exclCents)),
    Btw: formatEuroFromCents(sumBy(rows, (row) => row.taxCents)),
    Cash: formatEuroFromCents(sumBy(rows, (row) => row.cashCents)),
    Terminal: formatEuroFromCents(sumBy(rows, (row) => row.cardCents)),
    Online: formatEuroFromCents(sumBy(rows, (row) => row.onlineCents)),
    Beginkas: '',
    Verwacht: '',
    Geteld: '',
    Verschil: euroOrBlank(sumKnown(rows, (row) => row.differenceCents)),
    Correcties: sumBy(rows, (row) => row.adjustmentCount),
    Status: '',
  })
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(sheetRows), 'Kasboek')
  const raw = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return boldTotalRow(raw)
}

function pdfDayLabel(ymd: string): string {
  const [year, month, day] = ymd.slice(0, 10).split('-')
  return day && month && year ? `${day}/${month}/${year}` : ymd
}

function pdfStatus(row: CashbookRangeRow): string {
  if (row.closureDay && row.grossCents === 0 && row.status !== 'open' && row.status !== 'closed') return 'Sluitingsdag'
  if (row.status === 'closed') return 'Afgesloten'
  if (row.status === 'open' || row.grossCents !== 0) return 'Nog niet afgesloten'
  return '—'
}

function pdfMoney(cents: number | null | undefined, blankZero = false): string {
  if (cents == null) return '—'
  if (blankZero && cents === 0) return '—'
  return formatEuroFromCents(cents)
}

export async function renderCashbookPdf(meta: CashbookExportMeta, rows: CashbookRangeRow[]): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit')
  const columns: Array<{ title: string; width: number; align: 'left' | 'right'; cell: (row: CashbookRangeRow) => string; total: string }> = [
    { title: 'Datum', width: 72, align: 'left', cell: (row) => pdfDayLabel(row.date), total: 'Totaal' },
    { title: 'Omzet', width: 64, align: 'right', cell: (row) => pdfMoney(row.grossCents), total: formatEuroFromCents(sumBy(rows, (row) => row.grossCents)) },
    { title: 'Cash', width: 64, align: 'right', cell: (row) => pdfMoney(row.cashCents), total: formatEuroFromCents(sumBy(rows, (row) => row.cashCents)) },
    { title: 'Terminal', width: 68, align: 'right', cell: (row) => pdfMoney(row.cardCents), total: formatEuroFromCents(sumBy(rows, (row) => row.cardCents)) },
    { title: 'Online', width: 64, align: 'right', cell: (row) => pdfMoney(row.onlineCents), total: formatEuroFromCents(sumBy(rows, (row) => row.onlineCents)) },
    { title: 'Beginkas', width: 68, align: 'right', cell: (row) => pdfMoney(row.openingCents, true), total: '' },
    { title: 'Cash uit', width: 60, align: 'right', cell: (row) => pdfMoney(row.outCents), total: formatEuroFromCents(sumBy(rows, (row) => row.outCents)) },
    { title: 'Verwacht', width: 68, align: 'right', cell: (row) => pdfMoney(row.expectedCents), total: '' },
    { title: 'Geteld', width: 64, align: 'right', cell: (row) => pdfMoney(row.countedCents), total: '' },
    { title: 'Verschil', width: 64, align: 'right', cell: (row) => pdfMoney(row.differenceCents), total: euroOrBlank(sumKnown(rows, (row) => row.differenceCents)) || '—' },
    { title: 'Status', width: 130, align: 'left', cell: (row) => pdfStatus(row), total: '' },
  ]
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const margin = 28
    const rowHeight = 18
    const bottom = doc.page.height - 32

    const drawCell = (text: string, x: number, y: number, width: number, align: 'left' | 'right', bold: boolean, color: string) => {
      const yBefore = doc.y
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(color)
      doc.text(text, x + 4, y + 5, { width: width - 8, align, lineBreak: false, ellipsis: true })
      doc.y = yBefore
    }

    const drawHeader = (y: number) => {
      doc.rect(margin, y, tableWidth, rowHeight).fill('#0E5D82')
      let x = margin
      for (const column of columns) {
        drawCell(column.title, x, y, column.width, column.align, true, '#ffffff')
        x += column.width
      }
      return y + rowHeight
    }

    doc.fillColor('#0E5D82').font('Helvetica-Bold').fontSize(16).text('VYSION – KASBOEK', margin, margin, { lineBreak: false })
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
    const identity = [meta.businessName, meta.btwNumber ? `BTW ${meta.btwNumber}` : '', meta.address].filter(Boolean).join('  ·  ')
    doc.text(identity, margin, margin + 22, { width: tableWidth, lineBreak: false })
    doc.text(`Periode ${meta.periodLabel}`, margin, margin + 36, { width: tableWidth, lineBreak: false })

    let y = margin + 52
    y = drawHeader(y)
    rows.forEach((row, index) => {
      if (y + rowHeight > bottom) {
        doc.addPage()
        y = drawHeader(margin)
      }
      doc.rect(margin, y, tableWidth, rowHeight).fill(index % 2 === 0 ? '#f4f8fb' : '#ffffff')
      doc.moveTo(margin, y + rowHeight).lineTo(margin + tableWidth, y + rowHeight).strokeColor('#d5e0e8').lineWidth(0.4).stroke()
      let x = margin
      for (const column of columns) {
        drawCell(column.cell(row), x, y, column.width, column.align, false, '#111111')
        x += column.width
      }
      y += rowHeight
    })
    if (y + rowHeight > bottom) {
      doc.addPage()
      y = drawHeader(margin)
    }
    doc.rect(margin, y, tableWidth, rowHeight).fill('#0E5D82')
    let x = margin
    for (const column of columns) {
      drawCell(column.total, x, y, column.width, column.align, true, '#ffffff')
      x += column.width
    }
    doc.end()
  })
}
