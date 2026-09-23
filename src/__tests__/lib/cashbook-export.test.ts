import { strFromU8, unzipSync } from 'fflate'
import { buildBoekhoudingCsv, buildCashbookCsv, renderBoekhoudingXlsx, renderCashbookXlsx } from '@/lib/cashbook-export'
import { loadCashbookDay } from '@/lib/cashbook-store'
import type { CashbookRangeRow } from '@/lib/cashbook-store'

function row(partial: Partial<CashbookRangeRow>): CashbookRangeRow {
  return {
    date: '2026-09-23',
    status: 'open',
    grossCents: 2790,
    cashCents: 0,
    cardCents: 0,
    onlineCents: 2790,
    outCents: 0,
    openingCents: 0,
    expectedCents: 0,
    countedCents: null,
    differenceCents: null,
    adjustmentCount: 0,
    staffNames: [],
    closureDay: false,
    closureChoice: '',
    exclCents: 2491,
    taxCents: 299,
    discountCents: 0,
    refundCents: 0,
    vat: [{ rate: 12, baseCents: 2491, taxCents: 299, inclCents: 2790 }],
    ...partial,
  }
}

describe('kasboek export', () => {
  const meta = { businessName: 'Zaak', btwNumber: 'BE000', address: 'Straat 1', periodLabel: '2026-09-23' }

  it('zet dezelfde 27,90 in de dag-csv en de boekhoud-csv', () => {
    const lines = row({})
    const dayCsv = buildCashbookCsv(meta, [lines])
    const bookCsv = buildBoekhoudingCsv(meta, [lines])
    expect(dayCsv).toContain('€27,90')
    expect(dayCsv).toContain('€24,91')
    expect(dayCsv).toContain('€2,99')
    expect(bookCsv).toContain('€27,90')
    expect(bookCsv).toContain('€2,99')
    expect(bookCsv).not.toContain('zaak-b')
  })

  it('zet onderaan een totaal van de dagen', () => {
    const first = row({})
    const second = row({
      date: '2026-09-24',
      grossCents: 1000,
      onlineCents: 1000,
      exclCents: 893,
      taxCents: 107,
      cashCents: 250,
      differenceCents: -50,
      vat: [{ rate: 12, baseCents: 893, taxCents: 107, inclCents: 1000 }],
    })
    const bookCsv = buildBoekhoudingCsv(meta, [first, second])
    const dayCsv = buildCashbookCsv(meta, [first, second])
    expect(bookCsv).toContain('"Totaal"')
    expect(bookCsv).toContain('€37,90')
    expect(bookCsv).toContain('€2,50')
    expect(dayCsv).toContain('"Totaal"')
    expect(dayCsv).toContain('€37,90')
    expect(dayCsv).toContain('€33,84')
    expect(dayCsv).toContain('€4,06')
    expect(bookCsv).toContain('€4,06')
    expect(dayCsv).toContain('-€0,50')
    const files = unzipSync(new Uint8Array(renderCashbookXlsx(meta, [first, second])))
    const bookFiles = unzipSync(new Uint8Array(renderBoekhoudingXlsx(meta, [first, second])))
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml'])
    const styles = strFromU8(files['xl/styles.xml'])
    const bookSheet = strFromU8(bookFiles['xl/worksheets/sheet1.xml'])
    expect(sheet).toContain('VYSION – KASBOEK')
    expect(sheet).toContain('23/09/2026')
    expect(sheet).toContain('€37,90')
    expect(sheet).toMatch(/<v>Totaal<\/v>/)
    expect(sheet).toContain('customWidth="1"')
    expect(styles).toContain('FF0E5D82')
    expect(bookSheet).toContain('€37,90')
    expect(bookSheet).toContain('€2,50')
    expect(bookSheet).toContain('customWidth="1"')
  })
})

describe('kasboek tenantfilter', () => {
  it('filtert elke kasboek-query op de gevraagde zaak', async () => {
    const seen: string[] = []
    const client = {
      from(table: string) {
        const api: Record<string, unknown> = {}
        const self = () => api
        api.select = self
        api.order = self
        api.gte = self
        api.lte = self
        api.eq = (column: string, value: string) => {
          if (column === 'tenant_slug') seen.push(`${table}:${value}`)
          return api
        }
        api.range = () => Promise.resolve({ data: [], error: null })
        api.maybeSingle = () => Promise.resolve({ data: null, error: { code: '42P01', message: 'does not exist' } })
        api.then = (resolve: (value: unknown) => void) => resolve({ data: [], error: null })
        return api
      },
    }
    await loadCashbookDay(client as never, 'zaak-a', '2026-09-23')
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((entry) => entry.endsWith(':zaak-a'))).toBe(true)
    expect(seen.some((entry) => entry.startsWith('orders:'))).toBe(true)
    expect(seen.some((entry) => entry.startsWith('cashbook_days:'))).toBe(true)
    expect(seen.some((entry) => entry.includes('zaak-b'))).toBe(false)
  })
})
