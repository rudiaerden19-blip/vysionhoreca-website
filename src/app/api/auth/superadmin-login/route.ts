import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { loginRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    // Rate limiting: 5 login attempts per minute per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(loginRateLimiter, `superadmin:${clientIP}`)
    
    if (!rateLimitResult.success) {
      logger.warn('Superadmin login rate limited', { requestId, clientIP })
      return NextResponse.json(
        { error: 'Te veel login pogingen. Probeer het over een minuut opnieuw.' },
        { status: 429 }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email en wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      logger.error('Superadmin login failed: Supabase not configured', { requestId })
      return NextResponse.json(
        { error: 'Database niet geconfigureerd. Neem contact op met support.' },
        { status: 503 }
      )
    }

    const emailLower = email.trim().toLowerCase()

    // Find superadmin by email
    const { data: admin, error: adminError } = await supabase
      .from('super_admins')
      .select('id, email, name, password_hash, is_active')
      .eq('email', emailLower)
      .maybeSingle()

    if (adminError) {
      logger.error('Error finding superadmin', { requestId, error: adminError.message })
      return NextResponse.json(
        { error: 'Database fout' },
        { status: 500 }
      )
    }

    // Use constant-time comparison to prevent timing attacks
    // Always verify password even if no admin found (prevents user enumeration)
    const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4uSl9.y5zq5z5z5z'
    const hashToVerify = admin?.password_hash || dummyHash
    
    // Check if hash is bcrypt format
    const isBcrypt = hashToVerify.startsWith('$2')
    let isValid = false
    
    if (isBcrypt) {
      isValid = await bcrypt.compare(password, hashToVerify)
    } else if (admin) {
      // Legacy plain text comparison (for migration) - will be upgraded
      isValid = hashToVerify === password
    }

    if (!admin || !isValid || !admin.is_active) {
      logger.warn('Superadmin login failed', { 
        requestId, 
        email: emailLower, 
        reason: !admin ? 'not_found' : !isValid ? 'wrong_password' : 'inactive',
        clientIP 
      })
      return NextResponse.json(
        { error: 'Onjuiste email of wachtwoord' },
        { status: 401 }
      )
    }

    // Auto-upgrade plain text passwords to bcrypt
    if (!isBcrypt) {
      const newHash = await bcrypt.hash(password, 12)
      await supabase
        .from('super_admins')
        .update({ password_hash: newHash })
        .eq('id', admin.id)
      logger.info('Superadmin password upgraded to bcrypt', { requestId, adminId: admin.id })
    }

    // Update last login
    await supabase
      .from('super_admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id)

    logger.info('Superadmin login successful', { 
      requestId, 
      adminId: admin.id, 
      duration: Date.now() - startTime 
    })

    // Return admin info (not sensitive data)
    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    })

  } catch (error) {
    logger.error('Superadmin login error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime 
    })
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
