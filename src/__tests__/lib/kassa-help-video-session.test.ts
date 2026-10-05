import {
  kassaHelpVideoSessionKey,
  loadKassaHelpVideoSession,
  saveKassaHelpVideoSession,
} from '@/lib/kassa-help-video-session'

describe('kassa-help-video-session', () => {
  const tenant = 'demo-frituur'

  beforeEach(() => {
    sessionStorage.clear()
  })

  it('persists open session with topic and step', () => {
    saveKassaHelpVideoSession(tenant, {
      open: true,
      topicId: 'add-category',
      stepIndex: 2,
    })
    expect(loadKassaHelpVideoSession(tenant)).toEqual({
      open: true,
      topicId: 'add-category',
      stepIndex: 2,
    })
  })

  it('clears storage when closed', () => {
    saveKassaHelpVideoSession(tenant, { open: true, topicId: 'pincode', stepIndex: 0 })
    saveKassaHelpVideoSession(tenant, { open: false, topicId: null, stepIndex: 0 })
    expect(sessionStorage.getItem(kassaHelpVideoSessionKey(tenant))).toBeNull()
  })
})
