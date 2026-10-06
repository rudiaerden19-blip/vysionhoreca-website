import type { NextRequest } from 'next/server'
import { isLocalDevSoundtrackBypass } from '@/lib/soundtrack/soundtrack-dev-auth'

function mockRequest(host: string): NextRequest {
  return {
    headers: { get: (key: string) => (key === 'host' ? host : null) },
  } as NextRequest
}

describe('isLocalDevSoundtrackBypass', () => {
  const prevEnv = process.env

  beforeEach(() => {
    process.env = { ...prevEnv, NODE_ENV: 'development', VYSION_MUSIC_DEV_BYPASS_AUTH: '1' }
  })

  afterAll(() => {
    process.env = prevEnv
  })

  it('allows localhost in development when flag is set', () => {
    expect(isLocalDevSoundtrackBypass(mockRequest('localhost:3000'))).toBe(true)
  })

  it('denies when flag is off', () => {
    process.env.VYSION_MUSIC_DEV_BYPASS_AUTH = '0'
    expect(isLocalDevSoundtrackBypass(mockRequest('localhost:3000'))).toBe(false)
  })
})
