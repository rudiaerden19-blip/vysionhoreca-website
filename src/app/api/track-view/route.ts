import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import crypto from 'crypto'

// Common bot user agents to filter out
const BOT_PATTERNS = [
  'bot', 'crawl', 'spider', 'slurp', 'bingpreview', 'facebookexternalhit',
  'googlebot', 'baiduspider', 'yandex', 'duckduckbot', 'semrush', 'ahrefs',
  'mj12bot', 'dotbot', 'petalbot', 'bytespider', 'gptbot', 'claudebot',
  'headlesschrome', 'phantomjs', 'selenium', 'puppeteer', 'lighthouse',
  'pagespeed', 'pingdom', 'uptimerobot', 'statuscake'
]

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true // No user agent = probably bot
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some(pattern => ua.includes(pattern))
}

function hashIP(ip: string): string {
  // Hash IP for privacy - we only need to deduplicate, not store actual IPs
  return crypto.createHash('sha256').update(ip + 'vysion_salt').digest('hex').substring(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { page_path, referrer } = body

    // Get user agent and IP from headers
    const user_agent = request.headers.get('user-agent') || null
    const country = request.headers.get('x-vercel-ip-country') || null
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Filter out bots
    if (isBot(user_agent)) {
      return NextResponse.json({ success: true, filtered: 'bot' })
    }

    // Create visitor hash for deduplication (IP + date)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const visitorHash = hashIP(ip + today)

    // Check if this visitor already viewed today
    const { data: existingView } = await supabase
      .from('page_views')
      .select('id')
      .eq('visitor_hash', visitorHash)
      .gte('created_at', `${today}T00:00:00`)
      .limit(1)
      .single()

    if (existingView) {
      // Already tracked this visitor today - skip
      return NextResponse.json({ success: true, filtered: 'duplicate' })
    }

    // Insert unique page view
    const { error } = await supabase
      .from('page_views')
      .insert({
        page_path: page_path || '/',
        referrer: referrer || null,
        user_agent,
        country,
        visitor_hash: visitorHash
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
