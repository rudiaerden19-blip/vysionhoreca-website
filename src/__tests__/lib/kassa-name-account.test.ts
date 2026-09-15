import type { KassaCartItem } from '@/lib/kassa-cart-types'
import {
  allocateNameTabPayment,
  cartLinesToTabLines,
  kassaCartLineTotalIncl,
  mergeIntoTabLines,
  tabOpenTotalIncl,
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
