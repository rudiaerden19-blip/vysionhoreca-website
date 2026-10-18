import {
  buildKassaDailyAuditReport,
  formatKassaDailyAuditReportHtml,
  formatKassaDailyAuditReportPlain,
  resolveKassaDailyAuditRecipientEmails,
  resolveKassaDailyAuditTenantSlugs,
  type KassaDailyAuditReport,
} from '@/lib/kassa-daily-audit-report'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertZohoSmtpConfigured, createZohoMailTransport } from '@/lib/zoho-smtp'
import { resolveZohoEmail } from '@/lib/vysion-contact'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'

export async function generateKassaDailyAuditReports(
  client: SupabaseClient,
  tenantSlugs: string[],
  opts?: { fiscalDate?: string; rangeEndUtc?: string },
): Promise<KassaDailyAuditReport[]> {
  const reports: KassaDailyAuditReport[] = []
  for (const slug of tenantSlugs) {
    reports.push(await buildKassaDailyAuditReport(client, slug, opts))
  }
  return reports
}

export async function sendKassaDailyAuditEmail(
  reports: KassaDailyAuditReport[],
): Promise<{ sent: boolean; error?: string; recipients?: string[] }> {
  const recipients = resolveKassaDailyAuditRecipientEmails()
  if (recipients.length === 0) {
    return { sent: false, error: 'KASSA_DAILY_AUDIT_EMAIL niet geconfigureerd' }
  }
  const smtpError = assertZohoSmtpConfigured()
  if (smtpError) {
    return { sent: false, error: smtpError }
  }

  const fiscalDate = reports[0]?.fiscalDate || getBelgiumDateString()
  const subject = `Kassa dagrapport ${fiscalDate} — vertrouwelijk`
  const text = formatKassaDailyAuditReportPlain(reports)
  const html = formatKassaDailyAuditReportHtml(reports)

  const transporter = createZohoMailTransport()
  await transporter.sendMail({
    from: resolveZohoEmail(),
    to: recipients.join(', '),
    subject,
    text,
    html,
  })

  return { sent: true, recipients }
}

export async function runKassaDailyAuditJob(
  client: SupabaseClient,
  opts?: { fiscalDate?: string; rangeEndUtc?: string; tenantSlugs?: string[] },
) {
  const tenantSlugs = opts?.tenantSlugs?.length
    ? opts.tenantSlugs
    : resolveKassaDailyAuditTenantSlugs()
  const reports = await generateKassaDailyAuditReports(client, tenantSlugs, opts)
  const mail = await sendKassaDailyAuditEmail(reports)
  return { reports, mail, tenantSlugs }
}
