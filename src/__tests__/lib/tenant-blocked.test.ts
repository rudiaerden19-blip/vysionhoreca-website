const maybeSingle = jest.fn()
const eq = jest.fn(() => ({ maybeSingle }))
const select = jest.fn(() => ({ eq }))
const from = jest.fn(() => ({ select }))

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => from(...(args as [])) },
}))

import { isTenantBlocked } from '@/lib/tenant-blocked'

describe('isTenantBlocked', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('filtert op de eigen slug in tenants', async () => {
    maybeSingle.mockResolvedValue({ data: { is_blocked: true }, error: null })
    await expect(isTenantBlocked(' zaak-a ')).resolves.toBe(true)
    expect(from).toHaveBeenCalledWith('tenants')
    expect(eq).toHaveBeenCalledWith('slug', 'zaak-a')
  })

  it('niet geblokkeerd bij false of null', async () => {
    maybeSingle.mockResolvedValue({ data: { is_blocked: false }, error: null })
    await expect(isTenantBlocked('zaak-b')).resolves.toBe(false)
    maybeSingle.mockResolvedValue({ data: { is_blocked: null }, error: null })
    await expect(isTenantBlocked('zaak-b')).resolves.toBe(false)
  })

  it('fail-open bij fout, ontbrekende rij of exception', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(isTenantBlocked('zaak-c')).resolves.toBe(false)
    maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(isTenantBlocked('zaak-c')).resolves.toBe(false)
    maybeSingle.mockRejectedValue(new Error('network'))
    await expect(isTenantBlocked('zaak-c')).resolves.toBe(false)
  })

  it('lege slug → geen query', async () => {
    await expect(isTenantBlocked('  ')).resolves.toBe(false)
    expect(from).not.toHaveBeenCalled()
  })
})
