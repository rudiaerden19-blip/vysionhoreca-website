import {
  clampOnAccountPaid,
  groupOnAccountEntriesByCustomer,
  groupOnAccountEntriesByDate,
  isOnAccountEntryDate,
  normalizeOnAccountCustomerName,
  onAccountIsSettled,
  onAccountMonthKey,
  onAccountPaidSoFar,
  onAccountRemaining,
  parseOnAccountAmount,
  summarizeOnAccountOpenByName,
  onAccountOpenDaysForCustomer,
  formatOnAccountDayShort,
  filterOnAccountNamesByQuery,
  uniqueOnAccountNames,
  allocateOnAccountPayment,
  onAccountCustomerTotals,
  type KassaOnAccountEntry,
} from '@/lib/kassa-on-account'

function row(partial: Partial<KassaOnAccountEntry>): KassaOnAccountEntry {
  return {
    id: partial.id ?? '1',
    tenant_slug: 'zaak',
    customer_name: partial.customer_name ?? 'Jan',
    entry_date: partial.entry_date ?? '2026-09-11',
    amount: partial.amount ?? 10,
    amount_paid: partial.amount_paid,
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

  it('toont elke naam maar één keer met alle dagen', () => {
    const people = groupOnAccountEntriesByCustomer([
      row({ id: 'a', customer_name: 'Danny Grens', entry_date: '2026-09-12', amount: 62 }),
      row({ id: 'b', customer_name: 'Jerry Aerden', entry_date: '2026-09-12', amount: 22 }),
      row({ id: 'c', customer_name: 'Danny Grens', entry_date: '2026-09-11', amount: 22 }),
    ])
    expect(people.map((p) => p.name)).toEqual(['Danny Grens', 'Jerry Aerden'])
    expect(people[0].entries.map((e) => e.entry_date)).toEqual(['2026-09-11', '2026-09-12'])
  })

  it('parst bedrag en maand', () => {
    expect(parseOnAccountAmount('7,90')).toBe(7.9)
    expect(parseOnAccountAmount(-1)).toBe(0)
    expect(onAccountMonthKey('2026-09-11')).toBe('2026-09')
    expect(isOnAccountEntryDate('2026-09-11')).toBe(true)
    expect(normalizeOnAccountCustomerName('  Jan  Piet ')).toBe('Jan Piet')
  })

  it('houdt restant open na een deelbetaling', () => {
    const partial = row({ amount: 33, amount_paid: 10, is_paid: false })
    expect(onAccountPaidSoFar(partial)).toBe(10)
    expect(onAccountRemaining(partial)).toBe(23)
    expect(onAccountIsSettled(partial)).toBe(false)
    expect(clampOnAccountPaid(33, 40)).toBe(33)
    expect(onAccountIsSettled(row({ amount: 22.5, amount_paid: 22.5 }))).toBe(true)
    expect(onAccountPaidSoFar(row({ amount: 33, is_paid: true }))).toBe(33)
    expect(onAccountRemaining(row({ amount: 22.5, amount_paid: 0 }))).toBe(22.5)
  })

  it('maakt een snelle namenlijst van wat nog open staat', () => {
    const list = summarizeOnAccountOpenByName([
      row({ id: 'a', customer_name: 'Bart', amount: 33, amount_paid: 10 }),
      row({ id: 'b', customer_name: 'Jerry', amount: 13.4 }),
      row({ id: 'c', customer_name: 'bart', amount: 8 }),
      row({ id: 'd', customer_name: 'Piet', amount: 12, amount_paid: 12, is_paid: true }),
    ])
    expect(list).toEqual([
      { name: 'Bart', remaining: 31 },
      { name: 'Jerry', remaining: 13.4 },
    ])
  })

  it('telt extra dag bij dezelfde klant op in het vak', () => {
    const days = onAccountOpenDaysForCustomer(
      [
        row({ id: 'a', customer_name: 'Danny Grens', entry_date: '2026-09-12', amount: 62 }),
        row({ id: 'b', customer_name: 'Danny Grens', entry_date: '2026-09-13', amount: 22 }),
        row({ id: 'c', customer_name: 'Jerry', entry_date: '2026-09-13', amount: 10 }),
      ],
      'danny grens',
    )
    expect(formatOnAccountDayShort('2026-09-12')).toBe('12/09')
    expect(days.total).toBe(84)
    expect(days.days.map((d) => [d.date, d.remaining])).toEqual([
      ['2026-09-12', 62],
      ['2026-09-13', 22],
    ])
  })

  it('vindt Jerry bij zoeken in een lange namenlijst', () => {
    const names = uniqueOnAccountNames([
      row({ id: 'a', customer_name: 'Danny Grens' }),
      row({ id: 'b', customer_name: 'Jerry Aerden' }),
      row({ id: 'c', customer_name: 'Vivivo Vivivo' }),
    ])
    expect(filterOnAccountNamesByQuery(names, 'jerry')).toEqual(['Jerry Aerden'])
    expect(filterOnAccountNamesByQuery(names, 'aer')).toEqual(['Jerry Aerden'])
  })

  it('toont nog open als totaal van alle dagen van Danny', () => {
    const danny = [
      row({ id: 'a', customer_name: 'Danny Grens', entry_date: '2026-09-11', amount: 22 }),
      row({ id: 'b', customer_name: 'Danny Grens', entry_date: '2026-09-12', amount: 62 }),
    ]
    expect(onAccountCustomerTotals(danny)).toEqual({ total: 84, paid: 0, remaining: 84 })
    expect(allocateOnAccountPayment(danny, 20)).toEqual([
      { id: 'a', amount_paid: 20, is_paid: false },
      { id: 'b', amount_paid: 0, is_paid: false },
    ])
    expect(allocateOnAccountPayment(danny, 30)).toEqual([
      { id: 'a', amount_paid: 22, is_paid: true },
      { id: 'b', amount_paid: 8, is_paid: false },
    ])
  })
})
