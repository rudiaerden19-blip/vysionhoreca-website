import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeTenantSlug(s: string) {
  return (s || '').replace(/-/g, '').toLowerCase()
}

// GET - Get orders for a group session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')
    const group_id = searchParams.get('group_id')

    if (!session_id && !group_id) {
      return NextResponse.json(
        { error: 'session_id or group_id is required' },
        { status: 400 }
      )
    }

    if (session_id) {
      const { data: sess, error: sErr } = await supabase
        .from('group_order_sessions')
        .select('tenant_slug')
        .eq('id', session_id)
        .single()
      if (sErr || !sess?.tenant_slug) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      const access = await verifyTenantOrSuperAdmin(request, sess.tenant_slug)
      if (!access.authorized) {
        return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
      }
    } else if (group_id) {
      const { data: g, error: gErr } = await supabase
        .from('order_groups')
        .select('tenant_slug')
        .eq('id', group_id)
        .single()
      if (gErr || !g?.tenant_slug) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      const access = await verifyTenantOrSuperAdmin(request, g.tenant_slug)
      if (!access.authorized) {
        return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
      }
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        group_members(name, email, department)
      `)
      .eq('is_group_order', true)
      .order('created_at', { ascending: true })

    if (session_id) {
      query = query.eq('group_session_id', session_id)
    }

    if (group_id) {
      const { data: sessions } = await supabase
        .from('group_order_sessions')
        .select('id')
        .eq('group_id', group_id)

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        query = query.in('group_session_id', sessionIds)
      }
    }

    const { data, error } = await query

    if (error) throw error

    const ordersByMember: Record<string, NonNullable<typeof data>> = {}
    data?.forEach(order => {
      const memberName = order.group_members?.name || order.customer_name
      if (!ordersByMember[memberName]) {
        ordersByMember[memberName] = []
      }
      ordersByMember[memberName].push(order)
    })

    return NextResponse.json({
      orders: data,
      byMember: ordersByMember,
      summary: {
        totalOrders: data?.length || 0,
        totalAmount: data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
      }
    })
  } catch (error) {
    console.error('Error fetching group orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST - Create a group order (from member)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenant_slug,
      session_id,
      member_id,
      customer_name,
      items,
      notes,
      payment_method
    } = body

    if (!tenant_slug || !session_id || !customer_name || !items?.length) {
      return NextResponse.json(
        { error: 'tenant_slug, session_id, customer_name, and items are required' },
        { status: 400 }
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('group_order_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (normalizeTenantSlug(session.tenant_slug) !== normalizeTenantSlug(tenant_slug)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.status !== 'open') {
      return NextResponse.json(
        { error: 'Ordering session is closed' },
        { status: 400 }
      )
    }

    if (new Date(session.order_deadline) < new Date()) {
      return NextResponse.json(
        { error: 'Order deadline has passed' },
        { status: 400 }
      )
    }

    const subtotal = items.reduce(
      (sum: number, item: { total_price: number }) => sum + item.total_price,
      0
    )

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_slug: session.tenant_slug,
        customer_name,
        order_type: 'group',
        status: 'new',
        subtotal,
        total: subtotal,
        payment_method: payment_method || 'cash',
        delivery_notes: notes,
        group_session_id: session_id,
        group_member_id: member_id || null,
        is_group_order: true,
        requested_time: session.delivery_time
      })
      .select()
      .single()

    if (orderError) throw orderError

    const orderItems = items.map((item: {
      product_id?: string
      product_name: string
      quantity: number
      unit_price: number
      options_json?: Record<string, unknown>
      options_price?: number
      total_price: number
      notes?: string
    }) => ({
      order_id: order.id,
      tenant_slug: session.tenant_slug,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      options_json: item.options_json,
      options_price: item.options_price || 0,
      total_price: item.total_price,
      notes: item.notes
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating group order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
