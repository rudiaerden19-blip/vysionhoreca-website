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

function columnName(count: number): string {
  let index = count
  let name = ''
  while (index > 0) {
    const remainder = (index - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    index = Math.floor((index - 1) / 26)
  }
  return name
}

function layoutOverviewSheet(buffer: Buffer, headerRow: number, firstDataRow: number, totalRow: number, widths: number[]): Buffer {
  const files = unzipSync(new Uint8Array(buffer))
  const stylesKey = 'xl/styles.xml'
  const sheetKey = 'xl/worksheets/sheet1.xml'
  let styles = strFromU8(files[stylesKey])
  const fontCount = Number(styles.match(/<fonts count="(\d+)">/)?.[1] || 1)
  const fillCount = Number(styles.match(/<fills count="(\d+)">/)?.[1] || 2)
  const styleCount = Number(styles.match(/<cellXfs count="(\d+)">/)?.[1] || 1)
  styles = styles.replace(/<fonts count="\d+">/, `<fonts count="${fontCount + 1}">`)
  styles = styles.replace(
    '</fonts>',
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>`,
  )
  styles = styles.replace(/<fills count="\d+">/, `<fills count="${fillCount + 2}">`)
  styles = styles.replace(
    '</fills>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0E5D82"/><bgColor rgb="FF0E5D82"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F8FB"/><bgColor rgb="FFF4F8FB"/></patternFill></fill></fills>',
  )
  const accentRight = styleCount
  const accentLeft = styleCount + 1
  const zebraRight = styleCount + 2
  const zebraLeft = styleCount + 3
  styles = styles.replace(/<cellXfs count="\d+">/, `<cellXfs count="${styleCount + 4}">`)
  styles = styles.replace(
    '</cellXfs>',
    `<xf numFmtId="0" fontId="${fontCount}" fillId="${fillCount}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>` +
      `<xf numFmtId="0" fontId="${fontCount}" fillId="${fillCount}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
      `<xf numFmtId="0" fontId="0" fillId="${fillCount + 1}" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>` +
      `<xf numFmtId="0" fontId="0" fillId="${fillCount + 1}" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
      '</cellXfs>',
  )
  let sheet = strFromU8(files[sheetKey])
  const cols = `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
  sheet = sheet.includes('<cols>') ? sheet.replace(/<cols>[\s\S]*?<\/cols>/, cols) : sheet.replace('<sheetData>', `${cols}<sheetData>`)
  const paint = (rowNumber: number, styleForIndex: (index: number) => number) => {
    sheet = sheet.replace(new RegExp(`<row r="${rowNumber}"([^>]*)>([\\s\\S]*?)</row>`), (_full, attrs: string, inner: string) => {
      let index = 0
      const cells = inner.replace(/<c /g, () => {
        const styleId = styleForIndex(index)
        index += 1
        return `<c s="${styleId}" `
      })
      return `<row r="${rowNumber}"${attrs} ht="20" customHeight="1">${cells}</row>`
    })
  }
  const accent = (index: number) => (index === 0 || index === widths.length - 1 ? accentLeft : accentRight)
  const zebra = (index: number) => (index === 0 || index === widths.length - 1 ? zebraLeft : zebraRight)
  paint(headerRow, accent)
  for (let row = firstDataRow; row < totalRow; row += 1) {
    if ((row - firstDataRow) % 2 === 0) paint(row, zebra)
  }
  paint(totalRow, accent)
  sheet = sheet.replace(
    /<sheetViews>[\s\S]*?<\/sheetViews>/,
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`,
  )
  if (!sheet.includes('<mergeCells')) {
    const lastColumn = columnName(widths.length)
    sheet = sheet.replace('</worksheet>', `<mergeCells count="3"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/><mergeCell ref="A3:${lastColumn}3"/></mergeCells></worksheet>`)
  }
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

const overviewWidths = [14, 13, 12, 12, 13, 13, 12, 13, 12, 12, 12, 13, 12, 12, 22]

function vatAmount(row: CashbookRangeRow, rate: number): string {
  return formatEuroFromCents(rateTax(row, rate))
}

function vatTotal(rows: CashbookRangeRow[], rate: number): string {
  return formatEuroFromCents(sumBy(rows, (row) => rateTax(row, rate)))
}

function overviewSheet(meta: CashbookExportMeta, rows: CashbookRangeRow[]): unknown[][] {
  const identity = [meta.businessName, meta.btwNumber ? `BTW ${meta.btwNumber}` : '', meta.address].filter(Boolean).join('  ·  ')
  return [
    ['VYSION – KASBOEK'],
    [identity],
    [`Periode ${meta.periodLabel}`],
    ['Datum', 'Omzet', 'Btw 6%', 'Btw 9%', 'Btw 12%', 'Btw 21%', 'Cash', 'Terminal', 'Online', 'Beginkas', 'Cash uit', 'Verwacht', 'Geteld', 'Verschil', 'Status'],
    ...rows.map((row) => [
      pdfDayLabel(row.date),
      pdfMoney(row.grossCents),
      vatAmount(row, 6),
      vatAmount(row, 9),
      vatAmount(row, 12),
      vatAmount(row, 21),
      pdfMoney(row.cashCents),
      pdfMoney(row.cardCents),
      pdfMoney(row.onlineCents),
      pdfMoney(row.openingCents, true),
      pdfMoney(row.outCents),
      pdfMoney(row.expectedCents),
      pdfMoney(row.countedCents),
      pdfMoney(row.differenceCents),
      pdfStatus(row),
    ]),
    [
      'Totaal',
      formatEuroFromCents(sumBy(rows, (row) => row.grossCents)),
      vatTotal(rows, 6),
      vatTotal(rows, 9),
      vatTotal(rows, 12),
      vatTotal(rows, 21),
      formatEuroFromCents(sumBy(rows, (row) => row.cashCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.cardCents)),
      formatEuroFromCents(sumBy(rows, (row) => row.onlineCents)),
      '',
      formatEuroFromCents(sumBy(rows, (row) => row.outCents)),
      '',
      '',
      euroOrBlank(sumKnown(rows, (row) => row.differenceCents)) || '—',
      '',
    ],
  ]
}

function writeOverviewXlsx(meta: CashbookExportMeta, rows: CashbookRangeRow[], sheetName: string): Buffer {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(overviewSheet(meta, rows)), sheetName)
  const raw = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return layoutOverviewSheet(raw, 4, 5, 5 + rows.length, overviewWidths)
}

export function renderBoekhoudingXlsx(meta: CashbookExportMeta, rows: CashbookRangeRow[]): Buffer {
  return writeOverviewXlsx(meta, rows, 'Kasboek')
}

export function renderCashbookXlsx(meta: CashbookExportMeta, rows: CashbookRangeRow[]): Buffer {
  return writeOverviewXlsx(meta, rows, 'Kasboek')
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

function rowsForSheet(rows: CashbookRangeRow[]): CashbookRangeRow[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
  return rows.filter((row) => row.date <= today && !(row.grossCents === 0 && row.status === 'none' && !row.closureDay))
}

export async function renderCashbookPdf(meta: CashbookExportMeta, rows: CashbookRangeRow[]): Promise<Buffer> {
  const listed = rowsForSheet(rows)
  const { default: PDFDocument } = await import('pdfkit')
  const columns: Array<{ title: string; width: number; align: 'left' | 'right'; cell: (row: CashbookRangeRow) => string; total: string }> = [
    { title: 'Datum', width: 0, align: 'left', cell: (row) => pdfDayLabel(row.date), total: 'Totaal' },
    { title: 'Omzet', width: 0, align: 'right', cell: (row) => pdfMoney(row.grossCents), total: formatEuroFromCents(sumBy(listed, (row) => row.grossCents)) },
    { title: 'Btw 6%', width: 0, align: 'right', cell: (row) => vatAmount(row, 6), total: vatTotal(listed, 6) },
    { title: 'Btw 9%', width: 0, align: 'right', cell: (row) => vatAmount(row, 9), total: vatTotal(listed, 9) },
    { title: 'Btw 12%', width: 0, align: 'right', cell: (row) => vatAmount(row, 12), total: vatTotal(listed, 12) },
    { title: 'Btw 21%', width: 0, align: 'right', cell: (row) => vatAmount(row, 21), total: vatTotal(listed, 21) },
    { title: 'Cash', width: 0, align: 'right', cell: (row) => pdfMoney(row.cashCents), total: formatEuroFromCents(sumBy(listed, (row) => row.cashCents)) },
    { title: 'Terminal', width: 0, align: 'right', cell: (row) => pdfMoney(row.cardCents), total: formatEuroFromCents(sumBy(listed, (row) => row.cardCents)) },
    { title: 'Online', width: 0, align: 'right', cell: (row) => pdfMoney(row.onlineCents), total: formatEuroFromCents(sumBy(listed, (row) => row.onlineCents)) },
    { title: 'Beginkas', width: 0, align: 'right', cell: (row) => pdfMoney(row.openingCents, true), total: '' },
    { title: 'Cash uit', width: 0, align: 'right', cell: (row) => pdfMoney(row.outCents), total: formatEuroFromCents(sumBy(listed, (row) => row.outCents)) },
    { title: 'Verwacht', width: 0, align: 'right', cell: (row) => pdfMoney(row.expectedCents), total: '' },
    { title: 'Geteld', width: 0, align: 'right', cell: (row) => pdfMoney(row.countedCents), total: '' },
    { title: 'Verschil', width: 0, align: 'right', cell: (row) => pdfMoney(row.differenceCents), total: euroOrBlank(sumKnown(listed, (row) => row.differenceCents)) || '—' },
    { title: 'Status', width: 0, align: 'left', cell: (row) => pdfStatus(row), total: '' },
  ]

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 16 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const margin = 22
    const tableWidth = doc.page.width - margin * 2
    const padX = 5
    const tableTop = margin + 40
    const bottom = doc.page.height - margin
    let fontSize = 12
    const measuredWidths = (size: number) => columns.map((column) => {
      const texts = [column.title, column.total, ...listed.map((row) => column.cell(row))]
      doc.font('Helvetica-Bold').fontSize(size)
      const widest = texts.reduce((max, text) => Math.max(max, doc.widthOfString(text || '')), 0)
      return Math.ceil(widest + padX * 2)
    })
    let widths = measuredWidths(fontSize)
    while (widths.reduce((sum, width) => sum + width, 0) > tableWidth && fontSize > 9) {
      fontSize = Math.round((fontSize - 0.5) * 2) / 2
      widths = measuredWidths(fontSize)
    }
    const used = widths.reduce((sum, width) => sum + width, 0)
    if (used > tableWidth) {
      const scale = tableWidth / used
      widths = widths.map((width) => width * scale)
    } else {
      const spare = tableWidth - used
      widths = widths.map((width) => width + spare / widths.length)
    }
    for (let index = 0; index < columns.length; index += 1) columns[index].width = widths[index]
    const rowHeight = 30

    const drawCell = (text: string, x: number, y: number, width: number, align: 'left' | 'right', bold: boolean, color: string) => {
      const yBefore = doc.y
      doc.save()
      doc.rect(x, y, width, rowHeight).clip()
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(color)
      doc.text(text, x + padX, y + Math.max(2, (rowHeight - fontSize) / 2), {
        width: Math.max(4, width - padX * 2),
        align,
        lineBreak: false,
        ellipsis: true,
      })
      doc.restore()
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
    doc.fillColor('#334155').font('Helvetica').fontSize(11)
    const identity = [meta.businessName, meta.btwNumber ? `BTW ${meta.btwNumber}` : '', meta.address].filter(Boolean).join('  ·  ')
    doc.text(`${identity}   ·   Periode ${meta.periodLabel}`, margin, margin + 20, { width: tableWidth, lineBreak: false, ellipsis: true })

    const continuePage = () => {
      doc.addPage()
      doc.fillColor('#0E5D82').font('Helvetica-Bold').fontSize(14).text('VYSION – KASBOEK', margin, margin, { lineBreak: false })
      doc.fillColor('#334155').font('Helvetica').fontSize(11).text(`Vervolg  ·  ${identity}  ·  Periode ${meta.periodLabel}`, margin, margin + 18, { width: tableWidth, lineBreak: false, ellipsis: true })
      return drawHeader(margin + 36)
    }

    let y = tableTop
    y = drawHeader(y)
    listed.forEach((row, index) => {
      if (y + rowHeight > bottom) y = continuePage()
      doc.rect(margin, y, tableWidth, rowHeight).fill(index % 2 === 0 ? '#f4f8fb' : '#ffffff')
      doc.moveTo(margin, y + rowHeight).lineTo(margin + tableWidth, y + rowHeight).strokeColor('#d5e0e8').lineWidth(0.4).stroke()
      let x = margin
      for (const column of columns) {
        drawCell(column.cell(row), x, y, column.width, column.align, false, '#111111')
        x += column.width
      }
      y += rowHeight
    })
    if (y + rowHeight > bottom) y = continuePage()
    doc.rect(margin, y, tableWidth, rowHeight).fill('#0E5D82')
    let x = margin
    for (const column of columns) {
      drawCell(column.total, x, y, column.width, column.align, true, '#ffffff')
      x += column.width
    }
    doc.end()
  })
}
