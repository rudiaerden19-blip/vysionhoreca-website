import { GKS_PILOT_TERMINAL_ID } from '@/lib/gks-kassa/pilot-config'

const KEY = (tenant: string) => `gks_pos_fiscal_ticket_no_${tenant}_${GKS_PILOT_TERMINAL_ID}`

export function nextPosFiscalTicketNo(tenantSlug: string): number {
  if (typeof window === 'undefined') return 1
  try {
    const raw = localStorage.getItem(KEY(tenantSlug))
    const prev = raw ? parseInt(raw, 10) : 0
    const next = prev >= 999999999 ? 1 : prev + 1
    localStorage.setItem(KEY(tenantSlug), String(next))
    return next
  } catch {
    return 1
  }
}
