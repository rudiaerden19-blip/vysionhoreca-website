jest.mock('@/services/gksPartnerService', () => ({
  signPreBill: jest.fn(),
}))

jest.mock('@/lib/gks-kassa/fiscal-journal-api', () => ({
  gksFiscalJournalCreatePending: jest.fn(),
  gksFiscalJournalMarkSuccess: jest.fn(),
  gksFiscalJournalMarkFailed: jest.fn(),
}))

jest.mock('@/lib/gks-kassa/gks-availability', () => ({
  assertGksCanFiscalize: jest.fn().mockResolvedValue(null),
  gksAvailabilityToFlowError: jest.fn(),
}))

jest.mock('@/lib/gks-kassa/gks-internet-lock', () => ({
  getGksInternetOnline: jest.fn().mockReturnValue(true),
}))

import { signPreBill } from '@/services/gksPartnerService'
import {
  gksFiscalJournalCreatePending,
  gksFiscalJournalMarkSuccess,
} from '@/lib/gks-kassa/fiscal-journal-api'
import { gksSignPreBill } from '@/lib/gks-kassa/gks-fiscal-flows'
import type { GksActiveStaff } from '@/lib/gks-kassa/gks-staff'
import type { KassaCartItem } from '@/lib/kassa-cart-types'

const staff: GksActiveStaff = { id: 's1', name: 'Test', insz: '00000000097' }

const line: KassaCartItem = {
  cartKey: 'p1',
  product: { id: 'p1', name: 'Friet', price: 3, category_id: 'c1' } as KassaCartItem['product'],
  quantity: 1,
  choices: [],
}

describe('gksSignPreBill', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(gksFiscalJournalCreatePending as jest.Mock).mockResolvedValue({
      ok: true,
      data: { id: 'journal-uuid', status: 'PENDING' },
    })
    ;(gksFiscalJournalMarkSuccess as jest.Mock).mockResolvedValue({
      ok: true,
      data: { id: 'journal-uuid', status: 'SUCCESS' },
    })
    ;(signPreBill as jest.Mock).mockResolvedValue({
      posFiscalTicketNo: 77,
      posDateTime: '2026-06-07T12:00:00+02:00',
      terminalId: 'TERMINAL-01',
      deviceId: 'POS-01',
      posId: 'CFOD0010000001',
      eventOperation: 'PRE_BILL',
      fdmRef: {
        fdmId: 'FOD01987654',
        fdmDateTime: '2026-06-07T12:00:00Z',
        eventLabel: 'P',
        eventCounter: 10,
        totalCounter: 20,
      },
      fdmSwVersion: '1.0.0-mock',
      footer: [],
    })
  })

  it('voltooit signPreBill en journal SUCCESS', async () => {
    const res = await gksSignPreBill('gkstest', staff, 'BE0123456789', [line], () => 6)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.posFiscalTicketNo).toBe(77)
    expect(res.fiscalSnapshot.fdmRef.eventLabel).toBe('P')
    expect(signPreBill).toHaveBeenCalled()
    expect(gksFiscalJournalCreatePending).toHaveBeenCalledWith(
      expect.objectContaining({ mutation: 'signPreBill', eventLabel: 'P' }),
    )
  })
})
