import { createRetailWedgeSession, normalizeRetailWedgeCode } from '@/lib/retail-barcode-wedge'

describe('retail-barcode-wedge', () => {
  it('neemt een snelle burst met Enter als één scan', () => {
    const scans: string[] = []
    const session = createRetailWedgeSession({ onScan: (code) => scans.push(code) })
    let t = 1_000
    for (const ch of '5412345678901') {
      session.pushKey(ch, t)
      t += 12
    }
    session.pushKey('Enter', t + 20)
    expect(scans).toEqual(['5412345678901'])
    session.dispose()
  })

  it('neemt Tab als einde van de scan', () => {
    const scans: string[] = []
    const session = createRetailWedgeSession({ onScan: (code) => scans.push(code) })
    session.pushKey('8', 0)
    session.pushKey('7', 10)
    session.pushKey('1', 20)
    session.pushKey('Tab', 30)
    expect(scans).toEqual(['871'])
    session.dispose()
  })

  it('wist een trage toets en scant daarna niet een los teken', () => {
    jest.useFakeTimers()
    const scans: string[] = []
    const session = createRetailWedgeSession({ onScan: (code) => scans.push(code) })
    session.pushKey('a', 0)
    jest.advanceTimersByTime(200)
    session.pushKey('5', 400)
    session.pushKey('Enter', 410)
    expect(scans).toEqual([])
    session.dispose()
    jest.useRealTimers()
  })

  it('stuurt een snelle burst zonder Enter toch door', () => {
    jest.useFakeTimers()
    const scans: string[] = []
    const session = createRetailWedgeSession({ onScan: (code) => scans.push(code) })
    let t = 0
    for (const ch of '871234') {
      session.pushKey(ch, t)
      t += 15
    }
    jest.advanceTimersByTime(200)
    expect(scans).toEqual(['871234'])
    session.pushKey('Enter', t + 50)
    expect(scans).toEqual(['871234'])
    session.dispose()
    jest.useRealTimers()
  })

  it('haalt stuurtekens uit de code', () => {
    expect(normalizeRetailWedgeCode('\u000254123\r')).toBe('54123')
  })
})
