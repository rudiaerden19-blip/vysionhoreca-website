import type { Reservation } from '@/components/kassa-reservations/kassa-reservations-model'

export type ReservationReportRowLabels = {
  date: string
  time: string
  name: string
  phone: string
  email: string
  guests: string
  table: string
  status: string
  notes: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sortedRows(rows: Reservation[]): Reservation[] {
  return [...rows].sort(
    (a, b) =>
      a.reservation_date.localeCompare(b.reservation_date) || a.reservation_time.localeCompare(b.reservation_time),
  )
}

function rowCells(r: Reservation, statusLabel: (s: Reservation['status']) => string): string[] {
  return [
    r.reservation_date,
    (r.reservation_time || '').slice(0, 5),
    r.guest_name || '',
    r.guest_phone || '',
    r.guest_email || '',
    String(r.party_size ?? ''),
    r.table_number || '',
    statusLabel(r.status),
    [r.notes, r.special_requests].filter(Boolean).join(' · ') || '',
  ]
}

export function buildReservationReportPlainText(
  title: string,
  periodLabel: string,
  rows: Reservation[],
  colLabels: ReservationReportRowLabels,
  statusLabel: (s: Reservation['status']) => string,
): string {
  const header = [colLabels.date, colLabels.time, colLabels.name, colLabels.phone, colLabels.email, colLabels.guests, colLabels.table, colLabels.status, colLabels.notes]
  const lines = [title, periodLabel, '', header.join('\t')]
  for (const r of sortedRows(rows)) {
    lines.push(rowCells(r, statusLabel).join('\t'))
  }
  return lines.join('\n')
}

export function buildReservationReportCsv(
  rows: Reservation[],
  colLabels: ReservationReportRowLabels,
  statusLabel: (s: Reservation['status']) => string,
): string {
  const esc = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const header = [colLabels.date, colLabels.time, colLabels.name, colLabels.phone, colLabels.email, colLabels.guests, colLabels.table, colLabels.status, colLabels.notes]
  const lines = [header.map(esc).join(',')]
  for (const r of sortedRows(rows)) {
    lines.push(rowCells(r, statusLabel).map(esc).join(','))
  }
  return lines.join('\n')
}

export function buildReservationReportPrintHtml(
  businessName: string,
  title: string,
  periodLabel: string,
  rows: Reservation[],
  colLabels: ReservationReportRowLabels,
  statusLabel: (s: Reservation['status']) => string,
  formatDate: (d: string) => string,
): string {
  const th = (s: string) => `<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ccc;font-size:11px">${escapeHtml(s)}</th>`
  const td = (s: string) => `<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;vertical-align:top">${escapeHtml(s)}</td>`
  const bodyRows = sortedRows(rows)
    .map((r) => {
      const cells = rowCells(r, statusLabel)
      cells[0] = formatDate(r.reservation_date)
      return `<tr>${cells.map(td).join('')}</tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
  <h1>${escapeHtml(businessName || title)}</h1>
  <p class="meta">${escapeHtml(title)} · ${escapeHtml(periodLabel)} · ${rows.length} reservaties</p>
  <table>
    <thead><tr>
      ${th(colLabels.date)}${th(colLabels.time)}${th(colLabels.name)}${th(colLabels.phone)}${th(colLabels.email)}${th(colLabels.guests)}${th(colLabels.table)}${th(colLabels.status)}${th(colLabels.notes)}
    </tr></thead>
    <tbody>${rows.length ? bodyRows : `<tr><td colspan="9" style="padding:12px;color:#888">—</td></tr>`}</tbody>
  </table>
</body>
</html>`
}
