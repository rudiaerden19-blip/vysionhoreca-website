import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(apiRateLimiter, clientIP)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
        { status: 429 }
      )
    }

    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token en wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Wachtwoord moet minimaal 8 tekens zijn' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      console.error('Reset password failed: Supabase not configured')
      return NextResponse.json(
        { error: 'Service tijdelijk niet beschikbaar' },
        { status: 503 }
      )
    }

    // Find and validate token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .maybeSingle()

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { error: 'Ongeldige of verlopen reset link' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (new Date(resetToken.expires_at) < new Date()) {
      // Mark as used to prevent reuse
      await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', resetToken.id)

      return NextResponse.json(
        { error: 'Reset link is verlopen. Vraag een nieuwe aan.' },
        { status: 400 }
      )
    }

    // Hash new password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12)

    // Update password in business_profiles
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', resetToken.email)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json(
        { error: 'Kon wachtwoord niet updaten. Probeer opnieuw.' },
        { status: 500 }
      )
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetToken.id)

    // Clean up old tokens for this email
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('email', resetToken.email)
      .lt('expires_at', new Date().toISOString())

    return NextResponse.json({
      success: true,
      message: 'Wachtwoord succesvol gewijzigd',
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// GET endpoint to verify token is valid (for frontend)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token ontbreekt' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { valid: false, error: 'Service niet beschikbaar' },
        { status: 503 }
      )
    }

    const { data: resetToken } = await supabase
      .from('password_reset_tokens')
      .select('expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (!resetToken) {
      return NextResponse.json({ valid: false, error: 'Ongeldige link' })
    }

    if (resetToken.used_at) {
      return NextResponse.json({ valid: false, error: 'Link is al gebruikt' })
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Link is verlopen' })
    }

    return NextResponse.json({ valid: true })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Fout bij validatie' },
      { status: 500 }
    )
  }
}
