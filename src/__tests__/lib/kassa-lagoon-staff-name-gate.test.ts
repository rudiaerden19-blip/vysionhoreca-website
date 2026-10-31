import {
  lagoonEveningPickIsCurrent,
  lagoonKassaEveningId,
  writeLagoonEveningStaffPick,
} from '@/lib/kassa-lagoon-staff-name-gate'

describe('Lagoon naam één keer per avond', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('houdt de nacht bij de avond die om 21 uur begon', () => {
    expect(lagoonKassaEveningId(new Date('2026-10-31T17:50:00.000Z'))).toBe('2026-10-31')
    expect(lagoonKassaEveningId(new Date('2026-10-31T22:30:00.000Z'))).toBe('2026-10-31')
    expect(lagoonKassaEveningId(new Date('2026-11-01T00:30:00.000Z'))).toBe('2026-10-31')
    expect(lagoonKassaEveningId(new Date('2026-11-01T11:00:00.000Z'))).toBe('2026-11-01')
  })

  it('telt alleen een ingeklokte naam van deze avond', () => {
    const evening = new Date('2026-10-31T20:00:00.000Z')
    writeLagoonEveningStaffPick('thelagoon', 'tommy', evening)
    expect(lagoonEveningPickIsCurrent('thelagoon', 'tommy', ['tommy', 'marc'], evening)).toBe(true)
    expect(lagoonEveningPickIsCurrent('thelagoon', 'tommy', ['marc'], evening)).toBe(false)
    expect(lagoonEveningPickIsCurrent('thelagoon', 'marc', ['tommy', 'marc'], evening)).toBe(false)
    expect(lagoonEveningPickIsCurrent('ohgreen', null, [], evening)).toBe(true)

    const nextEvening = new Date('2026-11-01T20:00:00.000Z')
    expect(lagoonEveningPickIsCurrent('thelagoon', 'tommy', ['tommy'], nextEvening)).toBe(false)
  })
})
