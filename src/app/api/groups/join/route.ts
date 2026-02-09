import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Join a group using access code
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { access_code, name, email, phone, department, employee_id } = body

    if (!access_code || !name) {
      return NextResponse.json(
        { error: 'access_code and name are required' },
        { status: 400 }
      )
    }

    // Find group by access code
    const { data: group, error: groupError } = await supabase
      .from('order_groups')
      .select('*')
      .eq('access_code', access_code.toUpperCase())
      .eq('status', 'active')
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Invalid access code or group not active' },
        { status: 404 }
      )
    }

    // Check member limit
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
      .neq('status', 'removed')

    if (count !== null && count >= group.max_members) {
      return NextResponse.json(
        { error: 'Group has reached maximum members' },
        { status: 400 }
      )
    }

    // Check if email already exists in group
    if (email) {
      const { data: existing } = await supabase
        .from('group_members')
        .select('id, status')
        .eq('group_id', group.id)
        .eq('email', email)
        .single()

      if (existing) {
        if (existing.status === 'removed') {
          // Reactivate member
          const { data, error } = await supabase
            .from('group_members')
            .update({ status: 'active', name, phone, department, employee_id })
            .eq('id', existing.id)
            .select()
            .single()

          if (error) throw error

          return NextResponse.json({
            member: data,
            group: {
              id: group.id,
              name: group.name,
              tenant_slug: group.tenant_slug
            }
          })
        } else {
          // Already a member
          return NextResponse.json({
            member: existing,
            group: {
              id: group.id,
              name: group.name,
              tenant_slug: group.tenant_slug
            },
            message: 'Already a member of this group'
          })
        }
      }
    }

    // Create new member
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        name,
        email: email || null,
        phone: phone || null,
        department: department || null,
        employee_id: employee_id || null
      })
      .select()
      .single()

    if (memberError) throw memberError

    return NextResponse.json({
      member,
      group: {
        id: group.id,
        name: group.name,
        tenant_slug: group.tenant_slug
      }
    })
  } catch (error) {
    console.error('Error joining group:', error)
    return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
  }
}
