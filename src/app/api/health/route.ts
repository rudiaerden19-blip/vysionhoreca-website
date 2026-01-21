import { NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns the health status of all services.
 * Use this for monitoring and load balancer health checks.
 */
export async function GET() {
  const startTime = Date.now()
  
  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    services: {
      database: { status: 'unknown' as string, latency: 0 },
      stripe: { status: 'configured' as string },
      email: { status: 'configured' as string },
      redis: { status: 'unknown' as string },
    },
    environment: process.env.NODE_ENV || 'development',
  }

  // Check Database (Supabase)
  try {
    const dbStart = Date.now()
    const supabase = getServerSupabaseClient()
    
    if (supabase) {
      const { error } = await supabase
        .from('tenant_settings')
        .select('id')
        .limit(1)
      
      health.services.database = {
        status: error ? 'error' : 'healthy',
        latency: Date.now() - dbStart,
      }
    } else {
      health.services.database = { status: 'not_configured', latency: 0 }
    }
  } catch (error) {
    health.services.database = { status: 'error', latency: 0 }
    health.status = 'degraded'
  }

  // Check Stripe
  health.services.stripe = {
    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
  }

  // Check Email (Nodemailer)
  health.services.email = {
    status: process.env.EMAIL_HOST ? 'configured' : 'not_configured',
  }

  // Check Redis (Upstash)
  health.services.redis = {
    status: process.env.UPSTASH_REDIS_REST_URL ? 'configured' : 'not_configured',
  }

  // Determine overall health
  if (health.services.database.status === 'error') {
    health.status = 'unhealthy'
  } else if (health.services.database.status === 'not_configured') {
    health.status = 'degraded'
  }

  const responseTime = Date.now() - startTime

  return NextResponse.json(
    { 
      ...health, 
      responseTime: `${responseTime}ms` 
    },
    { 
      status: health.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  )
}
