export type KassaHelpVideoSessionState = {
  open: boolean
  topicId: string | null
  stepIndex: number
}

const STORAGE_PREFIX = 'vysion_kassa_help_v1'

export function kassaHelpVideoSessionKey(tenantSlug: string): string {
  return `${STORAGE_PREFIX}:${tenantSlug}`
}

export function loadKassaHelpVideoSession(tenantSlug: string): KassaHelpVideoSessionState {
  if (typeof window === 'undefined') {
    return { open: false, topicId: null, stepIndex: 0 }
  }
  try {
    const raw = sessionStorage.getItem(kassaHelpVideoSessionKey(tenantSlug))
    if (!raw) return { open: false, topicId: null, stepIndex: 0 }
    const parsed = JSON.parse(raw) as Partial<KassaHelpVideoSessionState>
    return {
      open: parsed.open === true,
      topicId: typeof parsed.topicId === 'string' ? parsed.topicId : null,
      stepIndex: typeof parsed.stepIndex === 'number' && parsed.stepIndex >= 0 ? parsed.stepIndex : 0,
    }
  } catch {
    return { open: false, topicId: null, stepIndex: 0 }
  }
}

export function saveKassaHelpVideoSession(tenantSlug: string, state: KassaHelpVideoSessionState): void {
  if (typeof window === 'undefined') return
  try {
    if (!state.open) {
      sessionStorage.removeItem(kassaHelpVideoSessionKey(tenantSlug))
      return
    }
    sessionStorage.setItem(kassaHelpVideoSessionKey(tenantSlug), JSON.stringify(state))
  } catch {
    /* private mode */
  }
}
