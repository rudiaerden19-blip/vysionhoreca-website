import {
  joinCustomerFullName,
  retailCardHolderMatchesQuery,
  splitCustomerFullName,
} from '@/lib/retail-loyalty/card-holder-search'

const jan = {
  display_name: 'Jan',
  customer_name: 'Jan Peeters',
  phone: '0470123456',
  email: 'jan@example.be',
  customer_address: 'Kerkstraat 12',
  customer_postal_code: '9000',
  customer_city: 'Gent',
  customer_btw_number: 'BE0123456789',
  card_code: '8990000000001',
}

describe('retailCardHolderMatchesQuery', () => {
  it('vindt een klant op voornaam, achternaam, adres en btw', () => {
    expect(retailCardHolderMatchesQuery(jan, 'jan')).toBe(true)
    expect(retailCardHolderMatchesQuery(jan, 'peeters')).toBe(true)
    expect(retailCardHolderMatchesQuery(jan, 'kerkstraat')).toBe(true)
    expect(retailCardHolderMatchesQuery(jan, 'BE0123')).toBe(true)
    expect(retailCardHolderMatchesQuery(jan, 'jan gent')).toBe(true)
  })

  it('slaat een klant over die niet past', () => {
    expect(retailCardHolderMatchesQuery(jan, 'marlboro')).toBe(false)
  })

  it('toont iedereen bij een lege zoekterm', () => {
    expect(retailCardHolderMatchesQuery(jan, '  ')).toBe(true)
  })
})

describe('splitCustomerFullName', () => {
  it('splitst voornaam en de rest als achternaam', () => {
    expect(splitCustomerFullName('Jan Van Den Berg')).toEqual({
      firstName: 'Jan',
      lastName: 'Van Den Berg',
    })
    expect(joinCustomerFullName('Jan', 'Van Den Berg')).toBe('Jan Van Den Berg')
    expect(splitCustomerFullName('Bastos')).toEqual({ firstName: 'Bastos', lastName: '' })
  })
})
