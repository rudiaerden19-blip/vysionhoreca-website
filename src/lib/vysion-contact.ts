/** Officieel support- en contactadres Vysion kassa's (Zoho / website). */
export const VYSION_INFO_EMAIL = 'info@vysion-kassa.com' as const

export function vysionInfoMailto(): string {
  return `mailto:${VYSION_INFO_EMAIL}`
}

/** SMTP-afzender wanneer ZOHO_EMAIL niet gezet is (lokaal / fallback). */
export function resolveZohoEmail(): string {
  return process.env.ZOHO_EMAIL || VYSION_INFO_EMAIL
}

export function resolveZohoUser(): string {
  return process.env.ZOHO_USER || process.env.ZOHO_EMAIL || VYSION_INFO_EMAIL
}
