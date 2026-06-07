import {
  applyGksPingResult,
  getGksInternetOnline,
  pingGksServerOnce,
  resetGksInternetLockForTest,
  GKS_PING_URL,
} from '@/lib/gks-kassa/gks-internet-lock'

describe('gks-internet-lock', () => {
  beforeEach(() => {
    resetGksInternetLockForTest()
    global.fetch = jest.fn()
  })

  it('starts locked until two consecutive successful pings', () => {
    expect(getGksInternetOnline()).toBe(false)
    applyGksPingResult(true)
    expect(getGksInternetOnline()).toBe(false)
    applyGksPingResult(true)
    expect(getGksInternetOnline()).toBe(true)
  })

  it('one failed ping locks immediately', () => {
    resetGksInternetLockForTest({ online: true })
    expect(getGksInternetOnline()).toBe(true)
    applyGksPingResult(false)
    expect(getGksInternetOnline()).toBe(false)
  })

  it('requires two successes after unlock from failure', () => {
    resetGksInternetLockForTest({ online: true })
    applyGksPingResult(false)
    applyGksPingResult(true)
    expect(getGksInternetOnline()).toBe(false)
    applyGksPingResult(true)
    expect(getGksInternetOnline()).toBe(true)
  })

  it('ping uses gks query and 1200ms abort', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    await pingGksServerOnce()
    expect(global.fetch).toHaveBeenCalledWith(
      GKS_PING_URL,
      expect.objectContaining({ cache: 'no-store', method: 'GET' }),
    )
  })
})
