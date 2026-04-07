import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

function getBelgiumDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' })
}

function belgiumHM(d = new Date()): string {
  return d.toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function normalizeHm(t: string | null | undefined): string {
  if (!t) return ''
  const s = String(t).trim()
  const parts = s.split(':')
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
  }
  return s
}

function workedHoursCalc(clockIn: string, clockOut: string, breakMin: number): number {
  const inN = normalizeHm(clockIn)
  const outN = normalizeHm(clockOut)
  const [inH, inM] = inN.split(':').map(Number)
  const [outH, outM] = outN.split(':').map(Number)
  const totalMinutes = outH * 60 + outM - (inH * 60 + inM) - (breakMin || 0)
  return Math.max(0, totalMinutes / 60)
}

export async function POST(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  let body: { tenant_slug?: string; pin?: string; action?: 'in' | 'out' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const tenant_slug = String(body.tenant_slug || '').trim()
  const pin = String(body.pin || '').trim()
  const action = body.action
  if (!tenant_slug || !pin || (action !== 'in' && action !== 'out')) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const { data: settings, error: settingsErr } = await supabase
    .from('tenant_settings')
    .select('kassa_staff_clock_enabled')
    .eq('tenant_slug', tenant_slug)
    .maybeSingle()

  if (settingsErr) {
    console.error('staff-clock settings', settingsErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  if (!settings?.kassa_staff_clock_enabled) {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 })
  }

  const { data: staffList, error: staffErr } = await supabase
    .from('staff')
    .select('id, name, pin, is_active')
    .eq('tenant_slug', tenant_slug)
    .eq('is_active', true)

  if (staffErr) {
    console.error('staff-clock staff', staffErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const staff = (staffList || []).find((s) => String(s.pin).trim() === pin)
  if (!staff) {
    return NextResponse.json({ ok: false, error: 'bad_pin' }, { status: 401 })
  }

  const today = getBelgiumDateString()
  const nowHm = belgiumHM()

  const { data: existing, error: exErr } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('tenant_slug', tenant_slug)
    .eq('staff_id', staff.id)
    .eq('date', today)
    .eq('absence_type', 'WORKED')
    .limit(1)
    .maybeSingle()

  if (exErr) {
    console.error('staff-clock existing', exErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  if (action === 'in') {
    if (existing?.clock_in && !existing.clock_out) {
      return NextResponse.json({
        ok: false,
        error: 'already_in',
        staffName: staff.name,
        clock_in: normalizeHm(existing.clock_in as string),
      })
    }
    if (existing?.clock_in && existing?.clock_out) {
      return NextResponse.json({
        ok: false,
        error: 'day_complete',
        staffName: staff.name,
      })
    }
    if (!existing) {
      const { data: inserted, error: insErr } = await supabase
        .from('timesheet_entries')
        .insert({
          tenant_slug,
          staff_id: staff.id,
          date: today,
          clock_in: nowHm,
          clock_out: null,
          break_minutes: 0,
          worked_hours: 0,
          absence_type: 'WORKED',
          is_approved: false,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insErr) {
        console.error('staff-clock insert', insErr)
        return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
      }
      return NextResponse.json({
        ok: true,
        staffName: staff.name,
        clock_in: normalizeHm(inserted.clock_in as string),
        clock_out: null,
      })
    }
    // Bestaande rij zonder clock_in (zeldzaam): vul aan
    const { data: updated, error: upErr } = await supabase
      .from('timesheet_entries')
      .update({
        clock_in: nowHm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (upErr) {
      console.error('staff-clock update in', upErr)
      return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      staffName: staff.name,
      clock_in: normalizeHm(updated.clock_in as string),
      clock_out: updated.clock_out ? normalizeHm(updated.clock_out as string) : null,
    })
  }

  // action === 'out'
  if (!existing?.clock_in) {
    return NextResponse.json({ ok: false, error: 'not_in', staffName: staff.name })
  }
  if (existing.clock_out) {
    return NextResponse.json({
      ok: false,
      error: 'already_out',
      staffName: staff.name,
      clock_out: normalizeHm(existing.clock_out as string),
    })
  }

  const brk = Number(existing.break_minutes) || 0
  const wh = workedHoursCalc(String(existing.clock_in), nowHm, brk)

  const { data: outRow, error: outErr } = await supabase
    .from('timesheet_entries')
    .update({
      clock_out: nowHm,
      worked_hours: wh,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (outErr) {
    console.error('staff-clock out', outErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    staffName: staff.name,
    clock_in: normalizeHm(outRow.clock_in as string),
    clock_out: normalizeHm(outRow.clock_out as string),
    worked_hours: wh,
  })
}
