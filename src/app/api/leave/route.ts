import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  staff_id UUID NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'vacation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant ON leave_requests(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff ON leave_requests(staff_id);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
`.trim()

// Check if leave_requests table exists - returns error message if not
async function checkTable(): Promise<string | null> {
  const { error } = await supabaseAdmin
    .from('leave_requests')
    .select('id')
    .limit(1)

  if (error && error.message.toLowerCase().includes('does not exist')) {
    return `De tabel 'leave_requests' bestaat niet in Supabase. Voer deze SQL uit in de Supabase SQL Editor:\n\n${MIGRATION_SQL}`
  }
  return null
}

// GET: fetch leave requests for a tenant
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenant = searchParams.get('tenant')
  const year = searchParams.get('year') || new Date().getFullYear().toString()

  if (!tenant) return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })

  const tableError = await checkTable()
  if (tableError) return NextResponse.json({ error: tableError }, { status: 500 })

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('tenant_slug', tenant)
    .gte('start_date', `${year}-01-01`)
    .lte('start_date', `${year}-12-31`)
    .order('requested_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: create or update leave request + timesheet entries
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, tenant, ...payload } = body

  if (!tenant) return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })

  const tableError = await checkTable()
  if (tableError) return NextResponse.json({ error: tableError }, { status: 500 })

  if (action === 'create') {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        tenant_slug: tenant,
        staff_id: payload.staff_id,
        leave_type: payload.leave_type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        reason: payload.reason || null,
        status: payload.status,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If approved, create timesheet entries
    if (payload.status === 'approved') {
      await createTimesheetEntries(tenant, payload.staff_id, payload.leave_type, payload.start_date, payload.end_date, payload.reason)
    }

    return NextResponse.json({ success: true, data })
  }

  if (action === 'approve') {
    const { error } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', payload.id)
      .eq('tenant_slug', tenant)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await createTimesheetEntries(tenant, payload.staff_id, payload.leave_type, payload.start_date, payload.end_date, payload.reason)
    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    // Remove timesheet entries first
    await deleteTimesheetEntries(tenant, payload.staff_id, payload.leave_type, payload.start_date, payload.end_date)

    const { error } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), notes: payload.notes || null })
      .eq('id', payload.id)
      .eq('tenant_slug', tenant)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    if (payload.was_approved) {
      await deleteTimesheetEntries(tenant, payload.staff_id, payload.leave_type, payload.start_date, payload.end_date)
    }

    const { error } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .eq('id', payload.id)
      .eq('tenant_slug', tenant)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

const LEAVE_TYPE_MAP: Record<string, string> = {
  vacation: 'VACATION', sick: 'SICK', maternity: 'MATERNITY',
  paternity: 'PATERNITY', unpaid: 'UNPAID', bereavement: 'SHORT_LEAVE', other: 'OTHER',
}

function getDates(start: string, end: string): string[] {
  const dates: string[] = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  let y = sy, m = sm, d = sd
  const dim = (y: number, m: number) => new Date(y, m, 0).getDate()
  for (let i = 0; i < 366; i++) {
    dates.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    if (y === ey && m === em && d === ed) break
    d++
    if (d > dim(y, m)) { d = 1; m++ }
    if (m > 12) { m = 1; y++ }
  }
  return dates
}

async function createTimesheetEntries(tenant: string, staffId: string, leaveType: string, start: string, end: string, reason?: string) {
  const absenceType = LEAVE_TYPE_MAP[leaveType] || 'OTHER'
  const dates = getDates(start, end)
  for (const date of dates) {
    const { data: existing } = await supabaseAdmin
      .from('timesheet_entries')
      .select('id')
      .eq('tenant_slug', tenant)
      .eq('staff_id', staffId)
      .eq('date', date)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin.from('timesheet_entries').update({
        absence_type: absenceType, absence_hours: 8, is_approved: true,
        notes: reason || leaveType,
      }).eq('id', existing.id)
    } else {
      await supabaseAdmin.from('timesheet_entries').insert({
        tenant_slug: tenant, staff_id: staffId, date,
        absence_type: absenceType, absence_hours: 8, worked_hours: 0,
        notes: reason || leaveType, is_approved: true,
      })
    }
  }
}

async function deleteTimesheetEntries(tenant: string, staffId: string, leaveType: string, start: string, end: string) {
  const absenceType = LEAVE_TYPE_MAP[leaveType] || 'OTHER'
  const dates = getDates(start, end)
  for (const date of dates) {
    await supabaseAdmin.from('timesheet_entries').delete()
      .eq('tenant_slug', tenant).eq('staff_id', staffId)
      .eq('date', date).eq('absence_type', absenceType)
  }
}
