import type { SupabaseClient } from '@supabase/supabase-js'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function loadTenantShopContact(
  supabase: SupabaseClient,
  tenantSlug: string,
): Promise<{ businessName: string; replyToEmail: string | null; phone: string | null }> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('business_name, smtp_from_name, email, phone')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const businessName =
    data?.business_name?.trim() ||
    data?.smtp_from_name?.trim() ||
    tenantSlug
  const replyToEmail = data?.email?.trim().toLowerCase() || null
  const phone = data?.phone?.trim() || null
  return { businessName, replyToEmail, phone }
}

/** Eén HTML-document (geen geneste `<html>`) — beter voor spamfilters. */
export function wrapRetailTransactionalEmailHtml(opts: {
  lang?: string
  title: string
  bodyHtml: string
  footerText: string
}): string {
  const lang = opts.lang || 'nl'
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:20px 12px;background-color:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#18181b;line-height:1.5;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:28px 24px;">
    ${opts.bodyHtml}
    <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;text-align:center;">${escapeHtml(opts.footerText)}</p>
  </div>
</body>
</html>`
}

export function transactionalMailHeaders(): Record<string, string> {
  return {
    'X-Entity-Ref-ID': crypto.randomUUID(),
  }
}

export function formatFromAddress(displayName: string, smtpUser: string): string {
  const safeName = displayName.replace(/"/g, '').trim() || smtpUser
  return `"${safeName}" <${smtpUser}>`
}
