/**
 * Aggregeer verkochte artikelen voor Z-rapport UI / print / mail.
 * Bron: `orders.items`JSON (kassa + webshop). Geen DB-migratie nodig.
 */

export type ZReportArticleLine = { label: string; qty: number; total: number }

type ParsedOrderLine = {
  name: string
  quantity: number
  price: number
  options?: Array<{ name?: string; price?: number }>
}

function parseLinesFromOrderItems(items: unknown): ParsedOrderLine[] {
  if (!Array.isArray(items)) return []
  const out: ParsedOrderLine[] = []
  for (const row of items) {
    const r = row as Record<string, unknown>
    if (typeof r.product_name === 'string') {
      out.push({
        name: r.product_name,
        quantity: Number(r.quantity) || 0,
        price: Number(r.unit_price ?? r.price) || 0,
      })
      continue
    }
    out.push({
      name: typeof r.name === 'string'? r.name : '',
      quantity: Number(r.quantity) || 0,
      price: Number(r.price) || 0,
      options: Array.isArray(r.options) ? (r.options as ParsedOrderLine['options']) : undefined,
    })
  }
  return out
}

function optionSignature(opts?: ParsedOrderLine['options']): string {
  if (!opts?.length) return ''
  return opts
    .map((o) => `${String(o?.name ?? '').trim()}@${Number(o?.price) || 0}`)
    .sort()
    .join(' | ')
}

function orderLineAmount(line: ParsedOrderLine): number {
  const q = Math.max(0, Number(line.quantity) || 0)
  const unit = Number(line.price) || 0
  const optUnit = Array.isArray(line.options)
    ? line.options.reduce((s, o) => s + (Number(o?.price) || 0), 0)
    : 0
  return Math.round((unit + optUnit) * q * 100) / 100
}

/** Alle orders moeten dezelfde set zijn als voor het Z-totaal (al gefilterd op tenant + fiscaliteit). */
export function aggregateZReportArticleLines(
  orders: ReadonlyArray<{ items?: unknown }>,
): ZReportArticleLine[] {
  const map = new Map<string, ZReportArticleLine>()
  for (const o of orders) {
    for (const raw of parseLinesFromOrderItems(o.items)) {
      const name = String(raw.name || '').trim() || 'Artikel'
      const sig = optionSignature(raw.options)
      const key = sig ? `${name}|||${sig}`: name
      const qty = Math.max(0, Number(raw.quantity) || 0)
      const amt = orderLineAmount(raw)
      let label = name
      if (raw.options?.length) {
        const bits = raw.options.map((x) => String(x?.name ?? '').trim()).filter(Boolean)
        if (bits.length) label = `${name} (${bits.join(', ')})`
      }
      const prev = map.get(key)
      if (prev) {
        prev.qty += qty
        prev.total = Math.round((prev.total + amt) * 100) / 100
      } else {
        map.set(key, { label, qty, total: amt })
      }
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'nl'))
}
