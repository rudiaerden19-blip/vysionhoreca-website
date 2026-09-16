import type { KassaCartItem } from '@/lib/kassa-cart-types'
import {
  allocateNameTabPayment,
  cartLinesToTabLines,
  isNameTabContextColumnError,
  kassaCartLineTotalIncl,
  mergeIntoTabLines,
  orderLinesGrossIncl,
  reduceNameTabLinesAfterPayment,
  resolveNameTabPaymentOrderPlan,
  tabOpenTotalIncl,
  NAME_ACCOUNT_PARTIAL_PRODUCT_ID,
} from '@/lib/kassa-name-account'

function line(id: string, price: number, qty: number, extra = 0): KassaCartItem {
  return {
    cartKey: id,
    quantity: qty,
    product: { id, name: id, price } as KassaCartItem['product'],
    choices: extra ? [{ optionId: 'o', optionName: 'L', choiceId: 'c', choiceName: 'Large', price: extra }] : undefined,
  }
}

describe('kassa-name-account', () => {
  it('line total incl opties', () => {
    expect(kassaCartLineTotalIncl(line('p', 7.95, 1, 3))).toBe(10.95)
  })

  it('merge tab + cart verhoogt open totaal', () => {
    const tab = cartLinesToTabLines([line('a', 4, 1)])
    const next = mergeIntoTabLines(tab, [line('b', 3, 1)])
    expect(tabOpenTotalIncl(next)).toBe(7)
  })

  it('volledige betaling leegt tab', () => {
    const tab = cartLinesToTabLines([line('a', 10, 1)])
    const { nextTabLines, appliedIncl, orderLines } = allocateNameTabPayment(tab, 10)
    expect(appliedIncl).toBe(10)
    expect(orderLines.length).toBe(1)
    expect(tabOpenTotalIncl(nextTabLines)).toBe(0)
  })

  it('volledige betaling leegt tab bij unpaid vs unit×qty mismatch', () => {
    const tab = cartLinesToTabLines([line('a', 3.94, 3)])
    tab[0].unpaidIncl = 11.8
    const { nextTabLines, appliedIncl } = allocateNameTabPayment(tab, 11.8)
    expect(appliedIncl).toBe(11.8)
    expect(tabOpenTotalIncl(nextTabLines)).toBe(0)
  })

  it('deelbetaling verdeelt exact betaald bedrag incl. rest centen', () => {
    const tab = cartLinesToTabLines([line('a', 3.94, 3)])
    tab[0].unpaidIncl = 11.8
    const pay1 = allocateNameTabPayment(tab, 8)
    expect(pay1.appliedIncl).toBe(8)
    expect(orderLinesGrossIncl(pay1.orderLines)).toBe(8)
    expect(tabOpenTotalIncl(pay1.nextTabLines)).toBe(3.8)
  })

  it('herkent Supabase kolom-fout voor BTW-context fallback', () => {
    expect(isNameTabContextColumnError('column kassa_name_tabs.order_type does not exist')).toBe(true)
    expect(isNameTabContextColumnError('network')).toBe(false)
  })

  it('deelbetaling €2 op tab met alleen unpaid (prijs 0 in snapshot)', () => {
    const tab = cartLinesToTabLines([line('a', 0, 1)])
    tab[0].product.price = 0
    tab[0].unpaidIncl = 4.5
    const pay = allocateNameTabPayment(tab, 2)
    expect(pay.appliedIncl).toBe(2)
    expect(orderLinesGrossIncl(pay.orderLines)).toBe(2)
    expect(tabOpenTotalIncl(pay.nextTabLines)).toBe(2.5)
  })

  it('volledige betaling leegt tab bij alleen unpaid (prijs 0 in snapshot)', () => {
    const tab = cartLinesToTabLines([line('a', 0, 1)])
    tab[0].product.price = 0
    tab[0].unpaidIncl = 2.4
    const pay = allocateNameTabPayment(tab, 2.4)
    expect(pay.appliedIncl).toBe(2.4)
    expect(orderLinesGrossIncl(pay.orderLines)).toBe(2.4)
    expect(tabOpenTotalIncl(pay.nextTabLines)).toBe(0)
  })

  it('deelbetaling €2 op €4,50 met opties — geen allocation mismatch', () => {
    const tab = cartLinesToTabLines([line('a', 1.5, 1, 3)])
    expect(tabOpenTotalIncl(tab)).toBe(4.5)
    const pay = allocateNameTabPayment(tab, 2)
    expect(pay.appliedIncl).toBe(2)
    expect(orderLinesGrossIncl(pay.orderLines)).toBe(2)
    expect(tabOpenTotalIncl(pay.nextTabLines)).toBe(2.5)
  })

  it('deelbetaling €2 wanneer open saldo lager is dan regeltotaal (snapshot)', () => {
    const tab = cartLinesToTabLines([line('a', 4.5, 1)])
    tab[0].unpaidIncl = 2
    const pay = allocateNameTabPayment(tab, 2)
    expect(pay.appliedIncl).toBe(2)
    expect(orderLinesGrossIncl(pay.orderLines)).toBe(2)
    expect(tabOpenTotalIncl(pay.nextTabLines)).toBe(0)
  })

  it('deelbetaling €2 op €4,50 — reduce tab FIFO', () => {
    const tab = cartLinesToTabLines([line('a', 4.5, 1)])
    expect(tabOpenTotalIncl(reduceNameTabLinesAfterPayment(tab, 2))).toBe(2.5)
  })

  it('deelbetaling plan: geen producten op bon, tab verlaagd', () => {
    const tab = cartLinesToTabLines([line('a', 4.5, 1)])
    const plan = resolveNameTabPaymentOrderPlan(tab, 2)
    expect(plan.showProductsOnReceipt).toBe(false)
    expect(plan.orderLines).toHaveLength(1)
    expect(plan.orderLines[0].product.id).toBe(NAME_ACCOUNT_PARTIAL_PRODUCT_ID)
    expect(orderLinesGrossIncl(plan.orderLines)).toBe(2)
    expect(tabOpenTotalIncl(plan.nextTabLines)).toBe(2.5)
  })

  it('volledige afrekening plan: tab-regels op bon', () => {
    const tab = cartLinesToTabLines([line('a', 4.5, 1)])
    const plan = resolveNameTabPaymentOrderPlan(tab, 4.5)
    expect(plan.showProductsOnReceipt).toBe(true)
    expect(plan.orderLines[0].product.name).toBe('a')
    expect(orderLinesGrossIncl(plan.orderLines)).toBe(4.5)
    expect(tabOpenTotalIncl(plan.nextTabLines)).toBe(0)
  })

  it('volledige afrekening na deelbetaling — bruto = resterend open', () => {
    const tab = cartLinesToTabLines([line('a', 4.5, 1)])
    tab[0].unpaidIncl = 3.5
    const plan = resolveNameTabPaymentOrderPlan(tab, 3.5)
    expect(plan.showProductsOnReceipt).toBe(true)
    expect(orderLinesGrossIncl(plan.orderLines)).toBe(3.5)
  })

  it('deelbetaling vandaag — rest morgen (FIFO)', () => {
    const tab = cartLinesToTabLines([line('a', 4, 1), line('b', 6, 1)])
    const pay1 = allocateNameTabPayment(tab, 4)
    expect(pay1.appliedIncl).toBe(4)
    expect(tabOpenTotalIncl(pay1.nextTabLines)).toBe(6)
    const pay2 = allocateNameTabPayment(pay1.nextTabLines, 6)
    expect(pay2.appliedIncl).toBe(6)
    expect(tabOpenTotalIncl(pay2.nextTabLines)).toBe(0)
  })
})
