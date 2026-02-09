import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List sessions for a group or tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const group_id = searchParams.get('group_id')
    const tenant_slug = searchParams.get('tenant_slug')
    const status = searchParams.get('status')

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
export async function POST(request: Request) {
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
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('group_order_sessions')
      .update(updates)
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
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
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
