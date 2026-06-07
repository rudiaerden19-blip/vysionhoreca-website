jest.mock('@/services/gksPartnerService', () => ({
  signCopy: jest.fn(),
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

import { signCopy } from '@/services/gksPartnerService'
import {
  gksFiscalJournalCreatePending,
  gksFiscalJournalMarkSuccess,
} from '@/lib/gks-kassa/fiscal-journal-api'
import { gksSignCopy } from '@/lib/gks-kassa/gks-fiscal-flows'

const staff = { id: 's1', name: 'Test', insz: '00000000097' }
const original = {
  posFiscalTicketNo: 39,
  posDateTime: '2026-06-07T21:36:00+02:00',
  fdmRef: {
    fdmId: 'FOD01987654',
    fdmDateTime: '2026-06-07T21:36:00Z',
    eventLabel: 'N' as const,
    eventCounter: 1001,
    totalCounter: 5001,
  },
  fdmSwVersion: '1.0.0-mock',
  footer: [],
  vatCalc: [],
  shortSignature: 'M3E9',
  verificationUrl: 'https://mock.checkbox.gks/FOD019876545',
}

describe('gksSignCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(gksFiscalJournalCreatePending as jest.Mock).mockResolvedValue({
      ok: true,
      data: { id: 'journal-copy', status: 'PENDING' },
    })
    ;(gksFiscalJournalMarkSuccess as jest.Mock).mockResolvedValue({
      ok: true,
      data: { id: 'journal-copy', status: 'SUCCESS' },
    })
    ;(signCopy as jest.Mock).mockResolvedValue({
      posFiscalTicketNo: 39,
      posDateTime: '2026-06-07T21:40:00+02:00',
      terminalId: 'TERMINAL-01',
      deviceId: 'POS-01',
      posId: 'CFOD0010000001',
      eventOperation: 'COPY',
      fdmRef: { ...original.fdmRef, eventLabel: 'C', eventCounter: 1002, totalCounter: 5002 },
      fdmSwVersion: '1.0.0-mock',
      shortSignature: 'M3E9',
      verificationUrl: original.verificationUrl,
      footer: [],
    })
  })

  it('behoudt QR en logt C-event', async () => {
    const res = await gksSignCopy('gkstest', staff, 'BE0123456789', original)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.fiscalSnapshot.verificationUrl).toBe(original.verificationUrl)
    expect(res.fiscalSnapshot.fdmRef.eventLabel).toBe('C')
    expect(gksFiscalJournalCreatePending).toHaveBeenCalledWith(
      expect.objectContaining({ eventLabel: 'C', mutation: 'signCopy' }),
    )
  })
})
