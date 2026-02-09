import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List members of a group
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const group_id = searchParams.get('group_id')

    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group_id)
      .neq('status', 'removed')
      .order('name')

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

// POST - Add member(s) to a group
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { group_id, members } = body

    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 })
    }

    // Check group member limit
    const { data: group } = await supabase
      .from('order_groups')
      .select('max_members')
      .eq('id', group_id)
      .single()

    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group_id)
      .neq('status', 'removed')

    // Handle single member or batch
    const membersToAdd = Array.isArray(members) ? members : [body]
    
    if (group && count !== null && count + membersToAdd.length > group.max_members) {
      return NextResponse.json(
        { error: `Maximum ${group.max_members} members allowed` },
        { status: 400 }
      )
    }

    const insertData = membersToAdd.map(m => ({
      group_id,
      name: m.name,
      email: m.email || null,
      phone: m.phone || null,
      department: m.department || null,
      employee_id: m.employee_id || null
    }))

    const { data, error } = await supabase
      .from('group_members')
      .upsert(insertData, { onConflict: 'group_id,email' })
      .select()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error adding members:', error)
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 })
  }
}

// PUT - Update a member
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('group_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// DELETE - Remove a member (soft delete)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('group_members')
      .update({ status: 'removed' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
