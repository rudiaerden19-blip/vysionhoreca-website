/**
 * Aggregeer verkochte artikelen voor Z-rapport UI / print / mail.
 * Bron: `orders.items` JSON (kassa + webshop). Geen DB-migratie nodig.
 *
 * Bedragen via `orderItemLineTotalEur` — zelfde bron als BTW/Z-totaal (total_price wint).
 */

import {
  orderItemDisplayName,
  orderItemDisplayOptionLines,
  orderItemLineTotalEur,
} from '@/lib/order-items-display'

export type ZReportArticleLine = { label: string; qty: number; total: number }

function parseItems(raw: unknown): unknown[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

function optionSignature(item: unknown): string {
  if (!item || typeof item !== 'object') return ''
  const o = item as Record<string, unknown>
  const parts: string[] = []

  const opts = o.options
  if (Array.isArray(opts)) {
    for (const x of opts) {
      if (!x || typeof x !== 'object') continue
      const r = x as Record<string, unknown>
      parts.push(`${String(r.name ?? r.option_name ?? '').trim()}@${Number(r.price) || 0}`)
    }
  }

  const ch = o.choices
  if (Array.isArray(ch)) {
    for (const x of ch) {
      if (!x || typeof x !== 'object') continue
      const r = x as Record<string, unknown>
      parts.push(`${String(r.choiceName ?? r.name ?? '').trim()}@${Number(r.price) || 0}`)
    }
  }

  return parts.sort().join(' | ')
}

function lineQuantity(item: unknown): number {
  if (!item || typeof item !== 'object') return 0
  return Math.max(0, Number((item as Record<string, unknown>).quantity) || 0)
}

/** Alle orders moeten dezelfde set zijn als voor het Z-totaal (al gefilterd op tenant + fiscaliteit). */
export function aggregateZReportArticleLines(
  orders: ReadonlyArray<{ items?: unknown }>,
): ZReportArticleLine[] {
  const map = new Map<string, ZReportArticleLine>()

  for (const o of orders) {
    for (const raw of parseItems(o.items)) {
      const amt = Math.round(orderItemLineTotalEur(raw) * 100) / 100
      const qty = lineQuantity(raw)
      if (amt <= 0 && qty <= 0) continue

      const name = orderItemDisplayName(raw).trim() || 'Artikel'
      const sig = optionSignature(raw)
      const key = sig ? `${name}|||${sig}` : name

      const optBits = orderItemDisplayOptionLines(raw)
      const label = optBits.length ? `${name} (${optBits.join(', ')})` : name

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
