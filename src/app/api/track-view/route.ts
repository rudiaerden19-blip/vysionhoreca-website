import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { page_path, referrer } = body

    // Get user agent and country from headers
    const user_agent = request.headers.get('user-agent') || null
    const country = request.headers.get('x-vercel-ip-country') || null

    // Insert page view
    const { error } = await supabase
      .from('page_views')
      .insert({
        page_path: page_path || '/',
        referrer: referrer || null,
        user_agent,
        country
      })

    if (error) {
      console.error('Failed to track page view:', error)
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track view error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
