import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List groups for a tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenant_slug = searchParams.get('tenant_slug')

    if (!tenant_slug) {
      return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('order_groups')
      .select(`
        *,
        group_members(count),
        group_order_sessions(
          id,
          title,
          order_deadline,
          status,
          total_orders,
          total_amount
        )
      `)
      .eq('tenant_slug', tenant_slug)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

// POST - Create a new group
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenant_slug,
      name,
      group_type,
      contact_name,
      contact_email,
      contact_phone,
      address_street,
      address_city,
      address_postal,
      max_members,
      allow_individual_payment,
      company_pays,
      notes
    } = body

    if (!tenant_slug || !name || !contact_name || !contact_email) {
      return NextResponse.json(
        { error: 'tenant_slug, name, contact_name, and contact_email are required' },
        { status: 400 }
      )
    }

    // Generate unique access code
    const { data: codeData } = await supabase.rpc('generate_group_access_code')
    const access_code = codeData || Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data, error } = await supabase
      .from('order_groups')
      .insert({
        tenant_slug,
        name,
        group_type: group_type || 'company',
        contact_name,
        contact_email,
        contact_phone,
        address_street,
        address_city,
        address_postal,
        max_members: max_members || 100,
        allow_individual_payment: allow_individual_payment !== false,
        company_pays: company_pays || false,
        access_code,
        notes
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}

// PUT - Update a group
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('order_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

// DELETE - Archive a group
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('order_groups')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving group:', error)
    return NextResponse.json({ error: 'Failed to archive group' }, { status: 500 })
  }
}
