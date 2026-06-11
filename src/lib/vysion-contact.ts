/** Officieel support- en contactadres Vysion kassa's (Zoho / website). */
export const VYSION_INFO_EMAIL = 'info@vysion-kassa.com' as const

export function vysionInfoMailto(): string {
  return `mailto:${VYSION_INFO_EMAIL}`
}

/** SMTP-login (Vercel: ZOHO_EMAIL of legacy ZOHO_MAIL). */
export function resolveZohoEmail(): string {
  return (
    process.env.ZOHO_EMAIL ||
    process.env.ZOHO_MAIL ||
    process.env.ZOHO_USER ||
    VYSION_INFO_EMAIL
  )
}

export function resolveZohoUser(): string {
  return process.env.ZOHO_USER || resolveZohoEmail()
}

export function resolveZohoPassword(): string {
  return process.env.ZOHO_PASSWORD || process.env.ZOHO_PASS || ''
}
