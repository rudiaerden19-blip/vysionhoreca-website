/**
 * Orders bewaren `items` als JSONB met verschillende shapes:
 * - Webshop: product_name, unit_price, total_price, options[]
 * - Kassa mand / open tafel: { product: { name, price }, quantity, choices[] }
 */

export function orderItemDisplayName(item: unknown): string {
  if (!item || typeof item !== 'object') return ''
  const o = item as Record<string, unknown>
  const nested = o.product
  if (nested && typeof nested === 'object') {
    const p = nested as Record<string, unknown>
    const n = p.name
    if (n != null && String(n).trim() !== '') return String(n)
  }
  const pn = o.product_name ?? o.name
  return pn != null ? String(pn) : ''
}

/** Regels voor bon/UI: webshop `options` of kassa `choices`. */
export function orderItemDisplayOptionLines(item: unknown): string[] {
  if (!item || typeof item !== 'object') return []
  const o = item as Record<string, unknown>
  const out: string[] = []
  const opts = o.options
  if (Array.isArray(opts)) {
    for (const x of opts) {
      if (x && typeof x === 'object') {
        const r = x as Record<string, unknown>
        const name = r.name ?? r.option_name
        if (name != null && String(name).trim() !== '') out.push(String(name))
      }
    }
    if (out.length) return out
  }
  const ch = o.choices
  if (Array.isArray(ch)) {
    for (const x of ch) {
      if (x && typeof x === 'object') {
        const r = x as Record<string, unknown>
        const name = r.choiceName ?? r.name
        if (name != null && String(name).trim() !== '') out.push(String(name))
      }
    }
  }
  return out
}

/** Totaalprijs per regel (EUR); 0 als niet af te leiden. */
export function orderItemLineTotalEur(item: unknown): number {
  if (!item || typeof item !== 'object') return 0
  const o = item as Record<string, unknown>
  const q = Number(o.quantity) || 1
  const tp = o.total_price
  if (tp != null && !Number.isNaN(Number(tp))) return Number(tp)

  const nested = o.product
  if (nested && typeof nested === 'object') {
    const p = nested as Record<string, unknown>
    const base = Number(p.price) || 0
    const ch = o.choices
    let extras = 0
    if (Array.isArray(ch)) {
      for (const x of ch) {
        if (x && typeof x === 'object') {
          extras += Number((x as Record<string, unknown>).price) || 0
        }
      }
    }
    return (base + extras) * q
  }

  const unit = Number(o.unit_price ?? o.price ?? 0)
  return unit * q
}
