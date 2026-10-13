import { cloudEnqueueJobToUserResult } from '@/lib/print-agent-cloud/enqueue-client'

describe('cloudEnqueueJobToUserResult', () => {
  it('rejects failed jobs without implying success', () => {
    const r = cloudEnqueueJobToUserResult({ id: 'j1', status: 'failed' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/mislukt/)
  })

  it('accepts pending as queued not printed', () => {
    const r = cloudEnqueueJobToUserResult({ id: 'j2', status: 'pending' })
    expect(r).toEqual({ ok: true, delivery: 'cloud_queued', jobId: 'j2' })
  })

  it('accepts processing as queued', () => {
    const r = cloudEnqueueJobToUserResult({ id: 'j3', status: 'processing' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.delivery).toBe('cloud_queued')
  })
})
