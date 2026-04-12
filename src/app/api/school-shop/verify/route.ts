import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normCode(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, '')
}

/** Publiek: controleer schoolcode en retourneer week + product-id's (geen prijzen nodig voor filter). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenant_slug = (body?.tenant_slug as string)?.trim()
    const access_code = body?.access_code as string
    if (!tenant_slug || !access_code?.trim()) {
      return NextResponse.json({ error: 'tenant_slug en access_code verplicht' }, { status: 400 })
    }
    const code = normCode(access_code)
    if (code.length < 2 || code.length > 16) {
      return NextResponse.json({ error: 'Ongeldige code' }, { status: 400 })
    }

    const { data: week, error: wErr } = await supabase
      .from('school_shop_weeks')
      .select('id, title, order_deadline, status, tenant_slug')
      .eq('tenant_slug', tenant_slug)
      .eq('access_code', code)
      .maybeSingle()

    if (wErr || !week) {
      return NextResponse.json({ error: 'Code niet gevonden' }, { status: 404 })
    }

    if (week.status !== 'open') {
      return NextResponse.json({ error: 'Deze week is gesloten' }, { status: 403 })
    }

    const deadline = new Date(week.order_deadline)
    if (Number.isNaN(deadline.getTime()) || Date.now() >= deadline.getTime()) {
      return NextResponse.json({ error: 'Bestellen is gesloten (deadline voorbij)' }, { status: 403 })
    }

    const { data: rows, error: pErr } = await supabase
      .from('school_shop_week_products')
      .select('product_id, sort_order')
      .eq('week_id', week.id)
      .eq('tenant_slug', tenant_slug)
      .order('sort_order', { ascending: true })

    if (pErr) throw pErr
    const productIds = (rows || []).map((r) => r.product_id as string)
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'Geen producten ingesteld voor deze week' }, { status: 400 })
    }

    return NextResponse.json({
      weekId: week.id,
      title: week.title,
      orderDeadline: week.order_deadline,
      productIds,
      accessCode: code,
    })
  } catch (e) {
    console.error('school-shop verify', e)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
