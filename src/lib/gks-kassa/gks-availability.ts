'use client'

import type { GksActiveStaff } from '@/lib/gks-kassa/gks-staff'
import { assertGksStaffForFiscal } from '@/lib/gks-kassa/gks-staff'
export type GksFiscalGuardError = { code: string; message: string }
import { queryFdmStatus, type GksPartnerContext } from '@/services/gksPartnerService'
const PING_TIMEOUT_MS = 10_000

export type GksAvailabilityStatus =
  | 'ONLINE_OK'
  | 'INTERNET_OFFLINE'
  | 'FDM_UNREACHABLE'
  | 'FDM_ERROR'
  | 'UNKNOWN'

export type GksAvailability = {
  status: GksAvailabilityStatus
  message?: string
  checkedAt: number
}

export type GksAvailabilityContext = {
  tenantSlug: string
  staff: GksActiveStaff | null
  vatNo: string
}

export function partnerCtxFromAvailability(ctx: GksAvailabilityContext): GksPartnerContext {
  return {
    tenantSlug: ctx.tenantSlug,
    vatNo: ctx.vatNo?.trim() || 'BE0000000000',
    employeeId: ctx.staff?.insz ?? '00000000000',
    language: 'NL',
    ticketMedium: 'PAPER',
  }
}

/** Server bereikbaar via /api/ping (zelfde patroon als kassa-server-online). */
export async function checkInternetOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS)
  try {
    const res = await fetch('/api/ping', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

function isNetworkLikeMessage(msg: string): boolean {
  return /network|fetch|timeout|abort|failed|unreachable|econn|enotfound/i.test(msg)
}

/** FDM status via Checkbox GraphQL (gksPartnerService). */
export async function checkFdmStatus(
  ctx: GksPartnerContext,
): Promise<{ status: GksAvailabilityStatus; message?: string }> {
  try {
    const fdm = await queryFdmStatus(ctx)
    const messages = fdm.messages ?? []
    if (messages.some((m) => isNetworkLikeMessage(m))) {
      return { status: 'FDM_UNREACHABLE', message: messages.join('; ') }
    }
    if (messages.length > 0 || !fdm.operational) {
      return {
        status: 'FDM_ERROR',
        message: messages.join('; ') || 'FDM niet operationeel',
      }
    }
    if (!fdm.initialized) {
      return { status: 'FDM_ERROR', message: 'FDM niet geïnitialiseerd' }
    }
    return { status: 'ONLINE_OK' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'FDM status onbekend'
    if (isNetworkLikeMessage(message)) {
      return { status: 'FDM_UNREACHABLE', message }
    }
    return { status: 'FDM_ERROR', message }
  }
}

export async function getGksAvailability(ctx: GksAvailabilityContext): Promise<GksAvailability> {
  const checkedAt = Date.now()
  const online = await checkInternetOnline()
  if (!online) {
    return { status: 'INTERNET_OFFLINE', checkedAt }
  }
  if (!assertGksStaffForFiscal(ctx.staff)) {
    return { status: 'UNKNOWN', message: 'STAFF_REQUIRED', checkedAt }
  }
  const partner = partnerCtxFromAvailability(ctx)
  const fdm = await checkFdmStatus(partner)
  return { status: fdm.status, message: fdm.message, checkedAt }
}

export function gksAvailabilityBlocksFiscal(status: GksAvailabilityStatus): boolean {
  return status !== 'ONLINE_OK'
}

const STATUS_MESSAGES_NL: Record<GksAvailabilityStatus, string> = {
  ONLINE_OK: '',
  INTERNET_OFFLINE: 'Internetverbinding offline. GKS-verkoop kan niet afgerond worden.',
  FDM_UNREACHABLE: 'FDM/Checkbox niet bereikbaar. Fiscale registratie is geblokkeerd.',
  FDM_ERROR: 'FDM meldt een fout. Controleer de FDM-status voor u verder werkt.',
  UNKNOWN: 'GKS-beschikbaarheid onbekend. Fiscale acties zijn geblokkeerd.',
}

export function gksAvailabilityBannerMessage(
  availability: GksAvailability,
  t?: (key: string) => string,
): string {
  if (t) {
    const key = `gksAvailability.banner.${availability.status}`
    const translated = t(key)
    if (translated !== key) return translated
  }
  if (availability.status === 'UNKNOWN' && availability.message === 'STAFF_REQUIRED') {
    return t?.('gksAvailability.banner.STAFF_REQUIRED') ?? 'Medewerker met INSZ vereist voor fiscale verkoop.'
  }
  return STATUS_MESSAGES_NL[availability.status] || availability.message || STATUS_MESSAGES_NL.UNKNOWN
}

export function gksAvailabilityToFlowError(availability: GksAvailability): GksFiscalGuardError {
  const code = availability.status
  return {
    code,
    message: gksAvailabilityBannerMessage(availability),
  }
}

/** Blokkeer fiscale flows (N/P/Z/C/print) vóór journal/FDM. */
export async function assertGksCanFiscalize(
  ctx: GksAvailabilityContext,
): Promise<GksFiscalGuardError | null> {
  const availability = await getGksAvailability(ctx)
  if (!gksAvailabilityBlocksFiscal(availability.status)) return null
  return gksAvailabilityToFlowError(availability)
}
