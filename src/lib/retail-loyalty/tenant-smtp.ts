import type { SupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export type TenantSmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  fromName: string
}

export async function resolveTenantSmtp(
  supabase: SupabaseClient,
  tenantSlug: string,
  businessNameFallback?: string,
): Promise<{ ok: true; smtp: TenantSmtpConfig } | { ok: false; error: 'smtp_not_configured' }> {
  let smtpHost = 'smtp.zoho.eu'
  let smtpPort = 465
  let smtpUser = process.env.ZOHO_EMAIL || ''
  let smtpPass = process.env.ZOHO_PASSWORD || ''
  let fromName = businessNameFallback || 'Vysion Horeca'

  const { data: smtpSettings } = await supabase
    .from('tenant_settings')
    .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name, business_name')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (smtpSettings?.smtp_host && smtpSettings?.smtp_user && smtpSettings?.smtp_password?.trim()) {
    smtpHost = smtpSettings.smtp_host
    smtpPort = smtpSettings.smtp_port || 465
    smtpUser = smtpSettings.smtp_user
    smtpPass = smtpSettings.smtp_password
    fromName =
      smtpSettings.smtp_from_name ||
      smtpSettings.business_name ||
      businessNameFallback ||
      'Vysion Horeca'
  } else if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
    return { ok: false, error: 'smtp_not_configured' }
  }

  return {
    ok: true,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser.trim(),
      pass: smtpPass.trim(),
      fromName,
    },
  }
}

export function createMailTransporter(smtp: TenantSmtpConfig) {
  const secure = smtp.port === 465
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure,
    requireTLS: !secure && smtp.port === 587,
    auth: { user: smtp.user, pass: smtp.pass },
  })
}
