import { NextRequest, NextResponse } from 'next/server'

const OFF_API = 'https://world.openfoodfacts.org/api/v2/product'
const UPC_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup'

function eanVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return []
  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    if (!s || seen.has(s)) return
    seen.add(s)
    out.push(s)
  }
  push(digits)
  if (digits.length === 12) push(`0${digits}`)
  if (digits.length === 13 && digits.startsWith('0')) push(digits.slice(1))
  return out
}

function parsePrice(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

async function lookupOpenFoodFacts(code: string): Promise<{ name: string; price: number | null } | null> {
  const res = await fetch(`${OFF_API}/${code}.json`, {
    headers: { 'User-Agent': 'VysionHoreca-RetailKassa/1.0 (contact: info@vysionhoreca.be)' },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    status?: number
    product?: {
      product_name?: string
      product_name_nl?: string
      product_name_fr?: string
      product_name_en?: string
      generic_name?: string
      brands?: string
      price?: unknown
      prices?: unknown
    }
  }
  if (data.status !== 1 || !data.product) return null
  const p = data.product
  const name =
    p.product_name_nl?.trim() ||
    p.product_name_fr?.trim() ||
    p.product_name_en?.trim() ||
    p.product_name?.trim() ||
    p.generic_name?.trim() ||
    (p.brands?.trim() ? p.brands.trim() : '')
  if (!name) return null
  const price = parsePrice(p.price) ?? parsePrice(p.prices)
  return { name, price }
}

async function lookupUpcItemDb(code: string): Promise<{ name: string; price: number | null } | null> {
  const res = await fetch(`${UPC_TRIAL}?upc=${encodeURIComponent(code)}`, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    items?: { title?: string; lowest_recorded_price?: number; highest_recorded_price?: number }[]
  }
  const item = data.items?.[0]
  if (!item?.title?.trim()) return null
  const price =
    parsePrice(item.lowest_recorded_price) ??
    parsePrice(item.highest_recorded_price)
  return { name: item.title.trim(), price }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ean')?.trim() || ''
  const codes = eanVariants(raw)
  if (codes.length === 0) {
    return NextResponse.json({ ok: false, name: null, price: null })
  }

  for (const code of codes) {
    try {
      const off = await lookupOpenFoodFacts(code)
      if (off) {
        return NextResponse.json({ ok: true, name: off.name, price: off.price, ean: code, source: 'openfoodfacts' })
      }
    } catch {
      /* try next */
    }
  }

  for (const code of codes) {
    try {
      const upc = await lookupUpcItemDb(code)
      if (upc) {
        return NextResponse.json({ ok: true, name: upc.name, price: upc.price, ean: code, source: 'upcitemdb' })
      }
    } catch {
      continue
    }
  }

  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 8) {
    return NextResponse.json({
      ok: true,
      name: `EAN ${digits}`,
      price: null,
      ean: digits,
      source: 'fallback',
    })
  }

  return NextResponse.json({ ok: false, name: null, price: null })
}
