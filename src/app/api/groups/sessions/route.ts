import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List sessions for a group or tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const group_id = searchParams.get('group_id')
    const tenant_slug = searchParams.get('tenant_slug')
    const status = searchParams.get('status')
    const access_code = searchParams.get('access_code')

    if (tenant_slug) {
      const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
      if (!access.authorized) {
        return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
      }
      if (group_id) {
        const { data: g } = await supabase
          .from('order_groups')
          .select('tenant_slug')
          .eq('id', group_id)
          .single()
        if (!g || g.tenant_slug !== tenant_slug) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    } else if (group_id) {
      if (!access_code?.trim()) {
        return NextResponse.json(
          { error: 'access_code is required for public group session listing' },
          { status: 400 }
        )
      }
      const { data: g, error: gErr } = await supabase
        .from('order_groups')
        .select('access_code')
        .eq('id', group_id)
        .eq('status', 'active')
        .single()
      if (gErr || !g || g.access_code.toUpperCase() !== access_code.trim().toUpperCase()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json(
        { error: 'tenant_slug or group_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('group_order_sessions')
      .select(`
        *,
        order_groups(name, contact_name, contact_email)
      `)
      .order('order_deadline', { ascending: false })

    if (group_id) {
      query = query.eq('group_id', group_id)
    }

    if (tenant_slug) {
      query = query.eq('tenant_slug', tenant_slug)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// POST - Create a new order session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      group_id,
      tenant_slug,
      title,
      description,
      order_deadline,
      delivery_time,
      status
    } = body

    if (!group_id || !tenant_slug || !order_deadline) {
      return NextResponse.json(
        { error: 'group_id, tenant_slug, and order_deadline are required' },
        { status: 400 }
      )
    }

    const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { data: g } = await supabase
      .from('order_groups')
      .select('tenant_slug')
      .eq('id', group_id)
      .single()
    if (!g || g.tenant_slug !== tenant_slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('group_order_sessions')
      .insert({
        group_id,
        tenant_slug,
        title,
        description,
        order_deadline,
        delivery_time,
        status: status || 'open'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

// PUT - Update a session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data: existing, error: loadError } = await supabase
      .from('group_order_sessions')
      .select('tenant_slug')
      .eq('id', id)
      .single()

    if (loadError || !existing?.tenant_slug) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const access = await verifyTenantOrSuperAdmin(request, existing.tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { tenant_slug: _t, group_id: _g, id: _i, ...safeUpdates } = updates as Record<string, unknown>

    const { data, error } = await supabase
      .from('group_order_sessions')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

// DELETE - Cancel a session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data: existing, error: loadError } = await supabase
      .from('group_order_sessions')
      .select('tenant_slug')
      .eq('id', id)
      .single()

    if (loadError || !existing?.tenant_slug) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const access = await verifyTenantOrSuperAdmin(request, existing.tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('group_order_sessions')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling session:', error)
    return NextResponse.json({ error: 'Failed to cancel session' }, { status: 500 })
  }
}
