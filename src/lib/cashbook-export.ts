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
  ]
  return lines.join('\n')
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
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(sheetRows), 'Kasboek')
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export async function renderCashbookPdf(meta: CashbookExportMeta, rows: CashbookRangeRow[]): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit')
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.fontSize(16).text('VYSION – DAGONTVANGSTEN / KASBOEK')
    doc.moveDown(0.4)
    doc.fontSize(10)
    doc.text(meta.businessName)
    if (meta.btwNumber) doc.text(`BTW ${meta.btwNumber}`)
    if (meta.address) doc.text(meta.address)
    doc.text(meta.periodLabel)
    doc.moveDown(0.6)
    for (const row of rows) {
      if (doc.y > 760) doc.addPage()
      doc.fontSize(11).text(`${row.date}  ·  ${row.status === 'closed' ? 'AFGESLOTEN' : row.status === 'open' ? 'OPEN' : '—'}`)
      doc.fontSize(9).text(
        `Dagontvangsten ${formatEuroFromCents(row.grossCents)}   excl. ${formatEuroFromCents(row.exclCents)}   btw ${formatEuroFromCents(row.taxCents)}`,
      )
      doc.text(
        `Cash ${formatEuroFromCents(row.cashCents)}   Terminal ${formatEuroFromCents(row.cardCents)}   Online ${formatEuroFromCents(row.onlineCents)}`,
      )
      doc.text(
        `Beginkas ${formatEuroFromCents(row.openingCents)}   Verwacht ${row.expectedCents == null ? '—' : formatEuroFromCents(row.expectedCents)}   Geteld ${row.countedCents == null ? '—' : formatEuroFromCents(row.countedCents)}   Verschil ${row.differenceCents == null ? '—' : formatEuroFromCents(row.differenceCents)}`,
      )
      const vatText = row.vat.map((line) => `${line.rate}% ${formatEuroFromCents(line.inclCents)}`).join('   ')
      if (vatText) doc.text(`BTW ${vatText}`)
      if (row.adjustmentCount) doc.text(`Correcties: ${row.adjustmentCount}`)
      doc.moveDown(0.4)
    }
    doc.end()
  })
}
