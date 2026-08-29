import {
  signTerminalOauthState,
  verifyTerminalOauthState,
} from '@/lib/kassa-payment-terminal-oauth'

describe('kassa-payment-terminal-oauth state', () => {
  const prev = process.env.SESSION_HMAC_SECRET

  beforeEach(() => {
    process.env.SESSION_HMAC_SECRET = 'a'.repeat(40)
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.SESSION_HMAC_SECRET
    else process.env.SESSION_HMAC_SECRET = prev
  })

  it('rond-trip tenant + provider', () => {
    const raw = signTerminalOauthState('pizza2018', 'sumup')
    expect(raw).toBeTruthy()
    const parsed = verifyTerminalOauthState(raw!)
    expect(parsed?.tenant).toBe('pizza2018')
    expect(parsed?.provider).toBe('sumup')
  })

  it('wijst geknoei af', () => {
    const raw = signTerminalOauthState('pizza2018', 'mollie')
    expect(verifyTerminalOauthState(`${raw}x`)).toBeNull()
    expect(verifyTerminalOauthState('niet-geldig')).toBeNull()
  })
})
