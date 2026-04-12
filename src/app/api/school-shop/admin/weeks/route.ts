import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normCode(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
    if (!tenant_slug) {
      return NextResponse.json({ error: 'tenant_slug verplicht' }, { status: 400 })
    }
    const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { data: weeks, error } = await supabase
      .from('school_shop_weeks')
      .select('id, title, access_code, order_deadline, status, created_at')
      .eq('tenant_slug', tenant_slug)
      .order('order_deadline', { ascending: false })

    if (error) throw error
    const wks = weeks || []
    if (wks.length === 0) return NextResponse.json([])

    const { data: prows } = await supabase
      .from('school_shop_week_products')
      .select('week_id, product_id, sort_order')
      .eq('tenant_slug', tenant_slug)
      .in(
        'week_id',
        wks.map((w) => w.id)
      )

    const byWeek = new Map<string, { product_id: string; sort_order: number }[]>()
    for (const r of prows || []) {
      const wid = r.week_id as string
      if (!byWeek.has(wid)) byWeek.set(wid, [])
      byWeek.get(wid)!.push({ product_id: r.product_id as string, sort_order: Number(r.sort_order) || 0 })
    }
    for (const arr of byWeek.values()) arr.sort((a, b) => a.sort_order - b.sort_order)

    const merged = wks.map((w) => ({
      ...w,
      products: byWeek.get(w.id) || [],
    }))
    return NextResponse.json(merged)
  } catch (e) {
    console.error('school-shop admin weeks GET', e)
    return NextResponse.json({ error: 'Mislukt' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenant_slug = (body?.tenant_slug as string)?.trim()
    const title = (body?.title as string)?.trim() || 'Schoolweek'
    const access_code = normCode(body?.access_code || '')
    const order_deadline = body?.order_deadline as string
    const product_ids: string[] = Array.isArray(body?.product_ids)
      ? (body.product_ids as unknown[]).map((x) => String(x))
      : []

    if (!tenant_slug || !access_code || !order_deadline) {
      return NextResponse.json({ error: 'tenant_slug, access_code en order_deadline verplicht' }, { status: 400 })
    }
    if (product_ids.length < 1 || product_ids.length > 4) {
      return NextResponse.json({ error: 'Kies 1 tot 4 producten' }, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const dl = new Date(order_deadline)
    if (Number.isNaN(dl.getTime())) {
      return NextResponse.json({ error: 'Ongeldige deadline' }, { status: 400 })
    }

    const { data: week, error: insErr } = await supabase
      .from('school_shop_weeks')
      .insert({
        tenant_slug,
        title,
        access_code,
        order_deadline: dl.toISOString(),
        status: 'open',
      })
      .select('id')
      .single()

    if (insErr) {
      if (/unique|duplicate/i.test(insErr.message)) {
        return NextResponse.json({ error: 'Deze code bestaat al voor deze zaak' }, { status: 409 })
      }
      throw insErr
    }

    const rows = product_ids.map((product_id: string, i: number) => ({
      tenant_slug,
      week_id: week.id,
      product_id,
      sort_order: i,
    }))

    const { error: pErr } = await supabase.from('school_shop_week_products').insert(rows)
    if (pErr) {
      await supabase.from('school_shop_weeks').delete().eq('id', week.id)
      throw pErr
    }

    return NextResponse.json({ id: week.id })
  } catch (e) {
    console.error('school-shop admin weeks POST', e)
    return NextResponse.json({ error: 'Mislukt' }, { status: 500 })
  }
}
