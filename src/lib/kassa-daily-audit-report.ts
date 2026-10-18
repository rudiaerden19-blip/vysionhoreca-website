import type { SupabaseClient } from '@supabase/supabase-js'
import { getBelgiumDateString, getDateBoundsForBelgium } from '@/lib/belgium-date-bounds'
import { isKassaPosOrder } from '@/lib/admin-api-order-helpers'
import { fetchAllOrdersInCreatedAtRange } from '@/lib/admin-api-order-operations'

export type KassaAuditSaleLine = {
  orderId: string
  orderNumber: number
  total: number
  paymentStatus: string
  status: string
  paymentMethod: string
  orderType: string
  createdAt: string
  staffId: string | null
  staffName: string | null
}

export type KassaAuditDeletedLine = {
  deletedAt: string
  actorEmail: string | null
  actorType: string
  orderId: string | null
  orderNumber: number | null
  total: number | null
  paymentStatus: string | null
  status: string | null
  staffId: string | null
  notes: string | null
}

export type KassaAuditChangedLine = {
  changedAt: string
  actorEmail: string | null
  actorType: string
  action: string
  orderId: string | null
  orderNumber: number | null
  beforeTotal: number | null
  afterTotal: number | null
  beforePaymentStatus: string | null
  afterPaymentStatus: string | null
  beforeStatus: string | null
  afterStatus: string | null
}

export type KassaDailyAuditReport = {
  tenantSlug: string
  businessName: string | null
  fiscalDate: string
  rangeStartUtc: string
  rangeEndUtc: string
  generatedAt: string
  sales: KassaAuditSaleLine[]
  salesTotalIncl: number
  salesCount: number
  deleted: KassaAuditDeletedLine[]
  changed: KassaAuditChangedLine[]
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function auditOrderSnapshots(beforeData: unknown): Record<string, unknown>[] {
  if (beforeData == null) return []
  if (Array.isArray(beforeData)) {
    return beforeData.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
  }
  if (typeof beforeData === 'object') return [beforeData as Record<string, unknown>]
  return []
}

function pickOrderField(row: Record<string, unknown>, key: string): unknown {
  return row[key]
}

export function resolveKassaDailyAuditTenantSlugs(): string[] {
  const raw =
    process.env.KASSA_DAILY_AUDIT_TENANT_SLUGS?.trim() ||
    'blonkys-restaurant,blonkyseethuis'
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function resolveKassaDailyAuditRecipientEmails(): string[] {
  const raw = process.env.KASSA_DAILY_AUDIT_EMAIL?.trim() || ''
  if (!raw) return []
  return raw.split(',').map((e) => e.trim()).filter((e) => e.includes('@'))
}

export async function buildKassaDailyAuditReport(
  client: SupabaseClient,
  tenantSlug: string,
  opts?: { fiscalDate?: string; rangeEndUtc?: string },
): Promise<KassaDailyAuditReport> {
  const fiscalDate = opts?.fiscalDate || getBelgiumDateString()
  const { startUTC, endUTC: dayEndUTC } = getDateBoundsForBelgium(fiscalDate)
  const rangeEndUtc = opts?.rangeEndUtc || new Date().toISOString()
  const rangeEnd = rangeEndUtc < dayEndUTC ? rangeEndUtc : dayEndUTC

  const { data: settings } = await client
    .from('tenant_settings')
    .select('business_name')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const orderRows = await fetchAllOrdersInCreatedAtRange(
    client,
    tenantSlug,
    startUTC,
    rangeEnd,
    'id,order_number,total,payment_status,status,payment_method,order_type,created_at,kassa_staff_id',
  )

  const staffIds = new Set<string>()
  for (const o of orderRows) {
    const sid = str(o.kassa_staff_id)
    if (sid) staffIds.add(sid)
  }

  const staffNameById = new Map<string, string>()
  if (staffIds.size > 0) {
    const { data: staffRows } = await client
      .from('staff')
      .select('id,name')
      .eq('tenant_slug', tenantSlug)
      .in('id', [...staffIds])
    for (const s of staffRows ?? []) {
      if (s?.id && s?.name) staffNameById.set(String(s.id), String(s.name))
    }
  }

  const sales: KassaAuditSaleLine[] = []
  let salesTotalIncl = 0

  for (const o of orderRows) {
    const orderType = str(o.order_type) || ''
    const paymentStatus = (str(o.payment_status) || '').toLowerCase()
    const stub = {
      order_type: orderType,
      payment_status: o.payment_status,
      status: o.status,
    }
    if (!isKassaPosOrder(stub)) continue
    if (paymentStatus !== 'paid') continue
    const st = (str(o.status) || '').toLowerCase()
    if (st === 'open') continue

    const total = num(o.total) ?? 0
    const staffId = str(o.kassa_staff_id)
    sales.push({
      orderId: String(o.id),
      orderNumber: num(o.order_number) ?? 0,
      total,
      paymentStatus: str(o.payment_status) || '',
      status: str(o.status) || '',
      paymentMethod: str(o.payment_method) || '',
      orderType,
      createdAt: String(o.created_at),
      staffId,
      staffName: staffId ? staffNameById.get(staffId) ?? null : null,
    })
    salesTotalIncl += total
  }

  sales.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const { data: auditRows, error: auditErr } = await client
    .from('audit_log')
    .select(
      'created_at,action,actor_email,actor_type,before_data,after_data,resource_id,notes',
    )
    .eq('tenant_slug', tenantSlug)
    .eq('resource_type', 'orders')
    .gte('created_at', startUTC)
    .lte('created_at', rangeEnd)
    .order('created_at', { ascending: true })

  if (auditErr) {
    console.warn('[kassa-daily-audit] audit_log fetch:', auditErr.message)
  }

  const deleted: KassaAuditDeletedLine[] = []
  const changed: KassaAuditChangedLine[] = []

  for (const row of auditRows ?? []) {
    const action = str(row.action) || ''
    const actorEmail = str(row.actor_email)
    const actorType = str(row.actor_type) || ''
    const changedAt = String(row.created_at)

    if (action === 'delete') {
      for (const snap of auditOrderSnapshots(row.before_data)) {
        deleted.push({
          deletedAt: changedAt,
          actorEmail,
          actorType,
          orderId: str(pickOrderField(snap, 'id')) || str(row.resource_id),
          orderNumber: num(pickOrderField(snap, 'order_number')),
          total: num(pickOrderField(snap, 'total')),
          paymentStatus: str(pickOrderField(snap, 'payment_status')),
          status: str(pickOrderField(snap, 'status')),
          staffId: str(pickOrderField(snap, 'kassa_staff_id')),
          notes: str(row.notes),
        })
      }
      continue
    }

    if (action === 'update') {
      const beforeList = auditOrderSnapshots(row.before_data)
      const afterList = auditOrderSnapshots(row.after_data)
      const before = beforeList[0] ?? {}
      const after = afterList[0] ?? {}
      const bt = num(pickOrderField(before, 'total'))
      const at = num(pickOrderField(after, 'total'))
      const bps = str(pickOrderField(before, 'payment_status'))
      const aps = str(pickOrderField(after, 'payment_status'))
      const bs = str(pickOrderField(before, 'status'))
      const as = str(pickOrderField(after, 'status'))
      const meaningful =
        bt !== at || bps !== aps || bs !== as
      if (!meaningful) continue
      changed.push({
        changedAt,
        actorEmail,
        actorType,
        action,
        orderId: str(pickOrderField(after, 'id')) || str(row.resource_id),
        orderNumber: num(pickOrderField(after, 'order_number')),
        beforeTotal: bt,
        afterTotal: at,
        beforePaymentStatus: bps,
        afterPaymentStatus: aps,
        beforeStatus: bs,
        afterStatus: as,
      })
    }
  }

  return {
    tenantSlug,
    businessName: settings?.business_name ? String(settings.business_name) : null,
    fiscalDate,
    rangeStartUtc: startUTC,
    rangeEndUtc: rangeEnd,
    generatedAt: new Date().toISOString(),
    sales,
    salesTotalIncl: Math.round(salesTotalIncl * 100) / 100,
    salesCount: sales.length,
    deleted,
    changed,
  }
}

function formatBrusselsTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('nl-BE', {
      timeZone: 'Europe/Brussels',
      dateStyle: 'short',
      timeStyle: 'medium',
    })
  } catch {
    return iso
  }
}

function eur(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`
}

export function formatKassaDailyAuditReportPlain(reports: KassaDailyAuditReport[]): string {
  const lines: string[] = []
  lines.push('KASSA DAGRAPPORT (vertrouwelijk)')
  lines.push(`Gegenereerd: ${formatBrusselsTime(new Date().toISOString())}`)
  lines.push('')

  for (const r of reports) {
    const title = r.businessName ? `${r.businessName} (${r.tenantSlug})` : r.tenantSlug
    lines.push('═'.repeat(60))
    lines.push(title)
    lines.push(`Datum (België): ${r.fiscalDate}`)
    lines.push(`Periode UTC: ${r.rangeStartUtc} → ${r.rangeEndUtc}`)
    lines.push('')
    lines.push(`VERKOPEN (betaald, kassa): ${r.salesCount} bonnen — totaal ${eur(r.salesTotalIncl)}`)
    lines.push('-'.repeat(60))
    for (const s of r.sales) {
      const staff = s.staffName || s.staffId || '—'
      lines.push(
        [
          formatBrusselsTime(s.createdAt),
          `bon #${s.orderNumber}`,
          eur(s.total),
          s.paymentMethod,
          staff,
        ].join(' | '),
      )
    }
    lines.push('')
    lines.push(`VERWIJDERDE BONNEN (audit): ${r.deleted.length}`)
    lines.push('-'.repeat(60))
    if (r.deleted.length === 0) {
      lines.push('(geen verwijderingen gelogd)')
    } else {
      for (const d of r.deleted) {
        lines.push(
          [
            formatBrusselsTime(d.deletedAt),
            `bon #${d.orderNumber ?? '?'}`,
            d.total != null ? eur(d.total) : '?',
            d.paymentStatus || '?',
            `door ${d.actorEmail || d.actorType}`,
          ].join(' | '),
        )
      }
    }
    lines.push('')
    lines.push(`WIJZIGINGEN OP BONNEN: ${r.changed.length}`)
    lines.push('-'.repeat(60))
    if (r.changed.length === 0) {
      lines.push('(geen relevante wijzigingen)')
    } else {
      for (const c of r.changed) {
        lines.push(
          [
            formatBrusselsTime(c.changedAt),
            `bon #${c.orderNumber ?? '?'}`,
            `${c.beforeTotal != null ? eur(c.beforeTotal) : '?'} → ${c.afterTotal != null ? eur(c.afterTotal) : '?'}`,
            `${c.beforePaymentStatus || '?'} → ${c.afterPaymentStatus || '?'}`,
            `door ${c.actorEmail || c.actorType}`,
          ].join(' | '),
        )
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function formatKassaDailyAuditReportHtml(reports: KassaDailyAuditReport[]): string {
  const sections = reports.map((r) => {
    const title = r.businessName ? `${r.businessName} (${r.tenantSlug})` : r.tenantSlug
    const saleRows = r.sales
      .map(
        (s) =>
          `<tr><td>${formatBrusselsTime(s.createdAt)}</td><td>#${s.orderNumber}</td><td>${eur(s.total)}</td><td>${s.paymentMethod}</td><td>${s.staffName || s.staffId || '—'}</td></tr>`,
      )
      .join('')
    const delRows =
      r.deleted.length === 0
        ? '<tr><td colspan="5"><em>Geen verwijderingen gelogd</em></td></tr>'
        : r.deleted
            .map(
              (d) =>
                `<tr><td>${formatBrusselsTime(d.deletedAt)}</td><td>#${d.orderNumber ?? '?'}</td><td>${d.total != null ? eur(d.total) : '?'}</td><td>${d.paymentStatus || '?'}</td><td>${d.actorEmail || d.actorType}</td></tr>`,
            )
            .join('')
    return `
      <h2 style="margin:24px 0 8px;">${title}</h2>
      <p>Datum: <strong>${r.fiscalDate}</strong> — ${r.salesCount} verkopen, totaal <strong>${eur(r.salesTotalIncl)}</strong></p>
      <h3>Verkopen (bonnummer + bedrag)</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <thead><tr><th>Tijd</th><th>Bon</th><th>Bedrag</th><th>Betaalwijze</th><th>Medewerker</th></tr></thead>
        <tbody>${saleRows}</tbody>
      </table>
      <h3 style="color:#b91c1c;">Verwijderde bonnen</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <thead><tr><th>Tijd</th><th>Bon</th><th>Bedrag</th><th>Betaalstatus</th><th>Account</th></tr></thead>
        <tbody>${delRows}</tbody>
      </table>
    `
  })

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#111;">
    <h1>Kassa dagrapport (vertrouwelijk)</h1>
    <p>Gegenereerd: ${formatBrusselsTime(new Date().toISOString())}</p>
    ${sections.join('')}
  </body></html>`
}
