import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normCode(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, '')
}

/** Valideer school-week + code + deadline + dat alle orderregels binnen de whitelist vallen. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenant_slug = (body?.tenant_slug as string)?.trim()
    const week_id = body?.week_id as string
    const access_code = body?.access_code as string
    const items = body?.items as { id?: string; product_id?: string; name?: string }[]

    if (!tenant_slug || !week_id || !access_code?.trim() || !Array.isArray(items)) {
      return NextResponse.json({ error: 'tenant_slug, week_id, access_code en items verplicht' }, { status: 400 })
    }

    const code = normCode(access_code)
    const { data: week, error: wErr } = await supabase
      .from('school_shop_weeks')
      .select('id, order_deadline, status, tenant_slug, access_code')
      .eq('id', week_id)
      .eq('tenant_slug', tenant_slug)
      .maybeSingle()

    if (wErr || !week) {
      return NextResponse.json({ error: 'Week niet gevonden' }, { status: 404 })
    }
    if (week.access_code !== code) {
      return NextResponse.json({ error: 'Ongeldige code' }, { status: 403 })
    }
    if (week.status !== 'open') {
      return NextResponse.json({ error: 'Week gesloten' }, { status: 403 })
    }
    if (Date.now() >= new Date(week.order_deadline).getTime()) {
      return NextResponse.json({ error: 'Deadline voorbij' }, { status: 403 })
    }

    const { data: rows } = await supabase
      .from('school_shop_week_products')
      .select('product_id')
      .eq('week_id', week_id)
      .eq('tenant_slug', tenant_slug)

    const allowed = new Set((rows || []).map((r) => r.product_id as string))
    if (allowed.size === 0) {
      return NextResponse.json({ error: 'Geen toegestane producten' }, { status: 400 })
    }

    for (const it of items) {
      const pid = (it.id || it.product_id) as string
      if (!pid || !allowed.has(pid)) {
        return NextResponse.json({ error: 'Niet-toegestaan product in mandje' }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('school-shop validate-order', e)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
