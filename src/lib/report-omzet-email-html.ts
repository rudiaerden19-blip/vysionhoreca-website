/**
 * HTML voor omzet/BTW-overzicht e-mail (zelfde inhoud als print-PDF in rapporten).
 * Table-layout voor betere weergave in mailclients.
 */

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtEuro(n: number): string {
  return `€${n.toFixed(2)}`
}

export type OmzetReportEmailBodyInput = {
  businessName: string
  /** Volledige adresregels (al gecombineerd voor e-mailheaders) */
  addressBlockLines: string[]
  btwNumber?: string
  periodLabel: string
  totalRev: number
  orderCount: number
  cash: number
  card: number
  subtotalExcl: number
  taxLow: number
  taxMid: number
  taxHigh: number
  totalTax: number
  generatedAtNl: string
}

export function buildOmzetReportEmailHtml(p: OmzetReportEmailBodyInput): string {
  const esc = escapeHtml

  const vatDetailRows: string[] = []
  if (p.taxLow > 0) {
    vatDetailRows.push(
      `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:15px;">BTW 6%</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;font-size:15px;color:#111827;">${fmtEuro(p.taxLow)}</td></tr>`,
    )
  }
  if (p.taxMid > 0) {
    vatDetailRows.push(
      `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:15px;">BTW 9% / 12%</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;font-size:15px;color:#111827;">${fmtEuro(p.taxMid)}</td></tr>`,
    )
  }
  if (p.taxHigh > 0) {
    vatDetailRows.push(
      `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:15px;">BTW 21%</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;font-size:15px;color:#111827;">${fmtEuro(p.taxHigh)}</td></tr>`,
    )
  }
  if (vatDetailRows.length === 0 && p.totalTax > 0) {
    vatDetailRows.push(
      `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:15px;">BTW</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;font-size:15px;color:#111827;">${fmtEuro(p.totalTax)}</td></tr>`,
    )
  }

  const addrHtml = p.addressBlockLines
    .map((line) => `<p style="margin:0 0 4px 0;color:#4b5563;font-size:14px;">${esc(line)}</p>`)
    .join('')

  const titleBand = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border-bottom:2px solid #1e293b;margin-bottom:12px;">
      <tr>
        <td valign="bottom" style="padding:0 12px 12px 0;">
          <h1 style="margin:0;font-size:22px;color:#1e293b;font-weight:bold;line-height:1.2;"> Omzet Rapport</h1>
        </td>
        <td valign="bottom" align="right" style="padding:0 0 12px 0;font-size:14px;color:#374151;line-height:1.45;max-width:280px;">
          <span style="font-weight:bold;color:#111827;font-size:15px;display:block;margin-bottom:4px;">${esc(p.businessName)}</span>
          Gegenereerd op <strong>${esc(p.generatedAtNl)}</strong>
        </td>
      </tr>
    </table>`

  const summaryCell = (label: string, value: string) => `
    <td width="50%" valign="top" style="padding:8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#334155;border-radius:8px;">
        <tr>
          <td style="padding:12px;color:#ffffff;font-family:Arial,sans-serif;">
            <div style="font-size:11px;opacity:0.75;margin-bottom:4px;">${esc(label)}</div>
            <div style="font-size:22px;font-weight:bold;line-height:1.2;">${value}</div>
          </td>
        </tr>
      </table>
    </td>`

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.businessName)} — Omzetrapport</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f4f6">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 28px 24px 28px;">
              ${titleBand}
              ${addrHtml}
              ${p.btwNumber ? `<p style="margin:8px 0 0 0;font-size:14px;color:#4b5563;">BTW: ${esc(p.btwNumber)}</p>`: ''}
              <p style="margin:12px 0 0 0;font-size:14px;color:#4b5563;">Periode: <strong>${esc(p.periodLabel)}</strong></p>

              <!-- Donkerblauwe samenvatting 2×2 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1e293b" style="border-radius:12px;margin:24px 0;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        ${summaryCell('Totale Omzet', fmtEuro(p.totalRev))}
                        ${summaryCell('Bestellingen', String(p.orderCount))}
                      </tr>
                      <tr>
                        ${summaryCell('Contant', fmtEuro(p.cash))}
                        ${summaryCell('PIN/Kaart', fmtEuro(p.card))}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h2 style="margin:28px 0 12px 0;font-size:18px;color:#374151;font-weight:bold;">BTW Overzicht</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 8px 0;">
                <tr>
                  <th align="left" style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;">Omschrijving</th>
                  <th align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;">Bedrag</th>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:15px;">Omzet excl. BTW</td>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;font-size:15px;color:#111827;">${fmtEuro(p.subtotalExcl)}</td>
                </tr>
                ${vatDetailRows.join('\n')}
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:15px;"><strong>Totaal BTW</strong></td>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;font-size:15px;"><strong>${fmtEuro(p.totalTax)}</strong></td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#111827;font-size:15px;"><strong>Totaal incl. BTW</strong></td>
                  <td style="padding:10px 0;text-align:right;font-family:Consolas,monospace;font-size:15px;"><strong>${fmtEuro(p.totalRev)}</strong></td>
                </tr>
              </table>

              <p style="margin:32px 0 0 0;font-size:11px;color:#9ca3af;">Gegenereerd op ${esc(p.generatedAtNl)} — Vysion kassa's POS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
