import type { SupabaseClient } from '@supabase/supabase-js'

/** Per-tenant: artikelregels (10 cola, …) in Z-scherm, mail, print en PDF. Standaard ja. */

export function zReportSendArticlesToAccountant(raw: unknown): boolean {
  if (raw === false || raw === 0 || raw === '0') return false
  if (typeof raw === 'string' && raw.trim().toLowerCase() === 'false') return false
  return true
}

/** Server-side bron voor mail/print — negeer client-payload als de tenant artikelen uit heeft staan. */
export async function fetchZReportIncludeSoldArticles(
  supabase: SupabaseClient | null,
  tenantSlug: string,
): Promise<boolean> {
  if (!supabase) return true
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('z_report_send_articles_to_accountant')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  if (error) return true
  return zReportSendArticlesToAccountant(data?.z_report_send_articles_to_accountant)
}
