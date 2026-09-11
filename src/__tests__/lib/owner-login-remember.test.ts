import {
  rememberOwnerLoginEmail,
  readRememberedOwnerLoginEmail,
  rememberOwnerLoginPassword,
  readRememberedOwnerLoginPassword,
} from '@/lib/auth-headers'

describe('owner login remember on device', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('onthoudt e-mail en wachtwoord na opnieuw lezen', () => {
    rememberOwnerLoginEmail('zaak@example.com')
    rememberOwnerLoginPassword('geheim-123')
    expect(readRememberedOwnerLoginEmail()).toBe('zaak@example.com')
    expect(readRememberedOwnerLoginPassword()).toBe('geheim-123')
  })
})
