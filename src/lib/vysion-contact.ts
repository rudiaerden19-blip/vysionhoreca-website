/**
 * Publiek contact + SMTP-fallback.
 * Blijf Zoho/Vercel op info@vysionhoreca.com tot de mailbox @vysion-kassa.com live is —
 * anders falen contactformulier, registratie-mail en klant-e-mail (535).
 */
export const VYSION_INFO_EMAIL = 'info@vysionhoreca.com' as const

export function vysionInfoMailto(): string {
  return `mailto:${VYSION_INFO_EMAIL}`
}

/** SMTP-login (Vercel: ZOHO_EMAIL of legacy ZOHO_MAIL). Moet overeenkomen met actieve Zoho-mailbox. */
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
