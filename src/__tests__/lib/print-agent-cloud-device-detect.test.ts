import {
  isIpadSafariCloudPrintClient,
  isWindowsDesktopPrintClient,
  shouldRoutePrintViaCloudQueue,
} from '@/lib/print-agent-cloud/device-detect'

function mockNavigator(partial: {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
}) {
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: partial.userAgent,
      platform: partial.platform ?? '',
      maxTouchPoints: partial.maxTouchPoints ?? 0,
    },
    configurable: true,
  })
}

describe('print-agent-cloud device detect', () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).navigator
  })

  it('detects Windows desktop', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120' })
    expect(isWindowsDesktopPrintClient()).toBe(true)
    expect(isIpadSafariCloudPrintClient()).toBe(false)
  })

  it('detects iPad UA', () => {
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    expect(isIpadSafariCloudPrintClient()).toBe(true)
  })

  it('detects touch Mac Safari as iPad-class', () => {
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })
    expect(isIpadSafariCloudPrintClient()).toBe(true)
  })

  it('routes cloud only when flag and iPad', () => {
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    })
    expect(shouldRoutePrintViaCloudQueue({ cloudPrintEnabled: true })).toBe(true)
    expect(shouldRoutePrintViaCloudQueue({ cloudPrintEnabled: false })).toBe(false)
  })

  it('never routes Windows to cloud queue', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })
    expect(shouldRoutePrintViaCloudQueue({ cloudPrintEnabled: true })).toBe(false)
  })
})
