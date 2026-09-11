import {
  groupOnAccountEntriesByDate,
  isOnAccountEntryDate,
  normalizeOnAccountCustomerName,
  onAccountMonthKey,
  parseOnAccountAmount,
  type KassaOnAccountEntry,
} from '@/lib/kassa-on-account'

function row(partial: Partial<KassaOnAccountEntry>): KassaOnAccountEntry {
  return {
    id: partial.id ?? '1',
    tenant_slug: 'zaak',
    customer_name: partial.customer_name ?? 'Jan',
    entry_date: partial.entry_date ?? '2026-09-11',
    amount: partial.amount ?? 10,
    is_paid: partial.is_paid ?? false,
  }
}

describe('kassa on-account lijst', () => {
  it('houdt elke dag apart per klant', () => {
    const groups = groupOnAccountEntriesByDate([
      row({ id: 'a', customer_name: 'Piet', entry_date: '2026-09-12', amount: 8 }),
      row({ id: 'b', customer_name: 'Jan', entry_date: '2026-09-11', amount: 5 }),
      row({ id: 'c', customer_name: 'Jan', entry_date: '2026-09-12', amount: 3 }),
    ])
    expect(groups.map((g) => g.date)).toEqual(['2026-09-12', '2026-09-11'])
    expect(groups[0].entries.map((e) => e.customer_name)).toEqual(['Jan', 'Piet'])
  })

  it('parst bedrag en maand', () => {
    expect(parseOnAccountAmount('7,90')).toBe(7.9)
    expect(parseOnAccountAmount(-1)).toBe(0)
    expect(onAccountMonthKey('2026-09-11')).toBe('2026-09')
    expect(isOnAccountEntryDate('2026-09-11')).toBe(true)
    expect(normalizeOnAccountCustomerName('  Jan  Piet ')).toBe('Jan Piet')
  })
})
