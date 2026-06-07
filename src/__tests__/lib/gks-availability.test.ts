jest.mock('@/services/gksPartnerService', () => ({
  queryFdmStatus: jest.fn(),
}))

import { queryFdmStatus } from '@/services/gksPartnerService'
import {
  assertGksCanFiscalize,
  checkFdmStatus,
  getGksAvailability,
  gksAvailabilityBlocksFiscal,
  gksAvailabilityDisablesFiscalUi,
  gksAvailabilityShowsOverlay,
} from '@/lib/gks-kassa/gks-availability'

const staff = { id: 's1', name: 'Test', insz: '00000000097' }
const ctx = { tenantSlug: 'gkstest', staff, vatNo: 'BE0123456789' }

describe('gks-availability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true })
  })

  it('returns INTERNET_OFFLINE when ping fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const availability = await getGksAvailability(ctx)
    expect(availability.status).toBe('INTERNET_OFFLINE')
    expect(gksAvailabilityBlocksFiscal(availability.status)).toBe(true)
  })

  it('returns FDM_UNREACHABLE when queryFdmStatus has network-like messages', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    ;(queryFdmStatus as jest.Mock).mockResolvedValue({
      operational: false,
      initialized: false,
      messages: ['fetch failed: network error'],
    })
    const fdm = await checkFdmStatus({
      tenantSlug: ctx.tenantSlug,
      vatNo: ctx.vatNo,
      employeeId: staff.insz,
      language: 'NL',
      ticketMedium: 'PAPER',
    })
    expect(fdm.status).toBe('FDM_UNREACHABLE')
  })

  it('returns FDM_ERROR when FDM is not operational', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    ;(queryFdmStatus as jest.Mock).mockResolvedValue({
      operational: false,
      initialized: true,
      messages: ['Certificate expired'],
    })
    const availability = await getGksAvailability(ctx)
    expect(availability.status).toBe('FDM_ERROR')
  })

  it('assertGksCanFiscalize blocks when internet offline', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    const err = await assertGksCanFiscalize(ctx)
    expect(err).not.toBeNull()
    expect(err?.code).toBe('INTERNET_OFFLINE')
  })

  it('assertGksCanFiscalize allows ONLINE_OK', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    ;(queryFdmStatus as jest.Mock).mockResolvedValue({
      operational: true,
      initialized: true,
      messages: [],
    })
    const err = await assertGksCanFiscalize(ctx)
    expect(err).toBeNull()
  })

  it('does not show overlay for staff-required UNKNOWN', () => {
    const availability = {
      status: 'UNKNOWN' as const,
      message: 'STAFF_REQUIRED',
      checkedAt: Date.now(),
    }
    expect(gksAvailabilityShowsOverlay(availability.status)).toBe(false)
    expect(gksAvailabilityDisablesFiscalUi(availability)).toBe(false)
  })

  it('shows overlay when internet offline', () => {
    expect(gksAvailabilityShowsOverlay('INTERNET_OFFLINE')).toBe(true)
    expect(
      gksAvailabilityDisablesFiscalUi({
        status: 'INTERNET_OFFLINE',
        checkedAt: Date.now(),
      }),
    ).toBe(true)
  })

  it('production kassa route does not import gks-availability guard', () => {
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')
    const kassaPage = path.join(
      process.cwd(),
      'src/app/shop/[tenant]/admin/kassa/page.tsx',
    )
    const src = fs.readFileSync(kassaPage, 'utf8')
    expect(src).not.toContain('gks-availability')
    expect(src).not.toContain('assertGksCanFiscalize')
  })
})
