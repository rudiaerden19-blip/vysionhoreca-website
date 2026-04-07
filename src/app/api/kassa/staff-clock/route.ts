import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { getBelgiumDateString, getDateBoundsForBelgium } from '@/lib/admin-api'

function normalizeHmFromTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Lijst actieve medewerkers + of er een open kloksessie is */
export async function GET(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
  if (!tenant_slug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const { data: settings, error: settingsErr } = await supabase
    .from('tenant_settings')
    .select('kassa_staff_clock_enabled')
    .eq('tenant_slug', tenant_slug)
    .maybeSingle()

  if (settingsErr) {
    console.error('staff-clock GET settings', settingsErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  if (!settings?.kassa_staff_clock_enabled) {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 })
  }

  const { data: staffList, error: staffErr } = await supabase
    .from('staff')
    .select('id, name')
    .eq('tenant_slug', tenant_slug)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (staffErr) {
    console.error('staff-clock GET staff', staffErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const { data: openSessions, error: sessErr } = await supabase
    .from('staff_clock_sessions')
    .select('staff_id')
    .eq('tenant_slug', tenant_slug)
    .is('clock_out_at', null)

  if (sessErr) {
    console.error('staff-clock GET sessions', sessErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const openSet = new Set((openSessions || []).map((r) => r.staff_id as string))

  return NextResponse.json({
    ok: true,
    staff: (staffList || []).map((s) => ({
      id: s.id,
      name: s.name,
      hasOpenSession: openSet.has(s.id as string),
    })),
  })
}

type PostBody = {
  tenant_slug?: string
  staff_id?: string
  pin?: string
  action?: 'in' | 'out'
}

export async function POST(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  let body: PostBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const tenant_slug = String(body.tenant_slug || '').trim()
  const staff_id = String(body.staff_id || '').trim()
  const pin = String(body.pin || '').trim()
  const action = body.action

  if (!tenant_slug || !staff_id || !pin || (action !== 'in' && action !== 'out')) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const { data: settings, error: settingsErr } = await supabase
    .from('tenant_settings')
    .select('kassa_staff_clock_enabled')
    .eq('tenant_slug', tenant_slug)
    .maybeSingle()

  if (settingsErr) {
    console.error('staff-clock POST settings', settingsErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  if (!settings?.kassa_staff_clock_enabled) {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 })
  }

  const { data: staffRow, error: staffErr } = await supabase
    .from('staff')
    .select('id, name, pin, is_active')
    .eq('tenant_slug', tenant_slug)
    .eq('id', staff_id)
    .maybeSingle()

  if (staffErr || !staffRow) {
    return NextResponse.json({ ok: false, error: 'staff_not_found' }, { status: 404 })
  }

  if (!staffRow.is_active) {
    return NextResponse.json({ ok: false, error: 'staff_inactive' }, { status: 403 })
  }

  if (String(staffRow.pin).trim() !== pin) {
    return NextResponse.json({ ok: false, error: 'bad_pin' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  if (action === 'in') {
    const { data: open, error: openErr } = await supabase
      .from('staff_clock_sessions')
      .select('id')
      .eq('tenant_slug', tenant_slug)
      .eq('staff_id', staff_id)
      .is('clock_out_at', null)
      .limit(1)
      .maybeSingle()

    if (openErr) {
      console.error('staff-clock in open check', openErr)
      return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    }

    if (open) {
      return NextResponse.json({
        ok: false,
        error: 'already_in',
        staffName: staffRow.name,
      })
    }

    const { data: inserted, error: insErr } = await supabase
      .from('staff_clock_sessions')
      .insert({
        tenant_slug,
        staff_id,
        clock_in_at: nowIso,
        clock_out_at: null,
        updated_at: nowIso,
      })
      .select('id, clock_in_at')
      .single()

    if (insErr) {
      console.error('staff-clock insert session', insErr)
      return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      staffName: staffRow.name,
      clock_in: normalizeHmFromTs(inserted.clock_in_at as string),
    })
  }

  // uitklokken
  const { data: session, error: sessErr } = await supabase
    .from('staff_clock_sessions')
    .select('id, clock_in_at')
    .eq('tenant_slug', tenant_slug)
    .eq('staff_id', staff_id)
    .is('clock_out_at', null)
    .order('clock_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sessErr) {
    console.error('staff-clock out find', sessErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ ok: false, error: 'not_in', staffName: staffRow.name })
  }

  const { error: upErr } = await supabase
    .from('staff_clock_sessions')
    .update({ clock_out_at: nowIso, updated_at: nowIso })
    .eq('id', session.id)

  if (upErr) {
    console.error('staff-clock out update', upErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const dayYmd = getBelgiumDateString()
  const { startUTC, endUTC } = getDateBoundsForBelgium(dayYmd)

  const { data: orderRows, error: ordErr } = await supabase
    .from('orders')
    .select('order_number, total')
    .eq('tenant_slug', tenant_slug)
    .eq('kassa_staff_id', staff_id)
    .eq('payment_status', 'paid')
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
    .order('order_number', { ascending: true })

  if (ordErr) {
    console.error('staff-clock sales query', ordErr)
    return NextResponse.json({
      ok: true,
      staffName: staffRow.name,
      clock_out: normalizeHmFromTs(nowIso),
      summary: { total: 0, order_count: 0, orders: [] as { order_number: number; total: number }[] },
    })
  }

  const orders = (orderRows || []).map((r) => ({
    order_number: Number(r.order_number),
    total: Number(r.total) || 0,
  }))
  const total = orders.reduce((s, o) => s + o.total, 0)

  return NextResponse.json({
    ok: true,
    staffName: staffRow.name,
    clock_out: normalizeHmFromTs(nowIso),
    summary: {
      total,
      order_count: orders.length,
      orders,
    },
  })
}
