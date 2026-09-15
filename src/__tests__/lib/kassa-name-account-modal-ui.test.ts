import {
  nameAccountModalSessionOnOpen,
  nameAccountOpenListVisible,
  nameAccountOpenTotalForName,
} from '@/lib/kassa-name-account-modal-ui'

const openList = [
  { id: '1', name: 'Bart', remaining: 12 },
  { id: '2', name: 'Rudi', remaining: 8 },
  { id: '3', name: 'Ronny', remaining: 10.5 },
]

describe('kassa-name-account-modal-ui', () => {
  it('nieuwe sessie: naam leeg, geen selectie', () => {
    expect(nameAccountModalSessionOnOpen()).toEqual({
      name: '',
      selectedTabId: null,
      confirmName: null,
      payAmount: '',
      error: null,
    })
  })

  it('lege naam toont volledige openstaande-lijst', () => {
    expect(nameAccountOpenListVisible('', openList)).toEqual(openList)
    expect(nameAccountOpenListVisible('   ', openList)).toEqual(openList)
  })

  it('ingetypte naam filtert lijst', () => {
    const filtered = nameAccountOpenListVisible('ron', openList)
    expect(filtered.map((x) => x.name)).toEqual(['Ronny'])
  })

  it('sommeert open saldo per klantnaam', () => {
    expect(nameAccountOpenTotalForName('Ronny', openList)).toBe(10.5)
    expect(nameAccountOpenTotalForName('Onbekend', openList)).toBe(0)
  })
})
