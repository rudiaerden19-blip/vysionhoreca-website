import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/verify-email?error=missing_token', request.url))
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      console.error('Verify email failed: Supabase not configured')
      return NextResponse.redirect(new URL('/verify-email?error=server_error', request.url))
    }

    // Find and validate token
    const { data: verificationToken, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .maybeSingle()

    if (tokenError || !verificationToken) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid_token', request.url))
    }

    // Check if token is expired (24 hours)
    if (new Date(verificationToken.expires_at) < new Date()) {
      await supabase
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', verificationToken.id)

      return NextResponse.redirect(new URL('/verify-email?error=expired_token', request.url))
    }

    // Mark email as verified in business_profiles
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({ 
        email_verified: true,
        email_verified_at: new Date().toISOString()
      })
      .eq('email', verificationToken.email)

    if (updateError) {
      console.error('Failed to verify email:', updateError)
      return NextResponse.redirect(new URL('/verify-email?error=update_failed', request.url))
    }

    // Mark token as used
    await supabase
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verificationToken.id)

    // Clean up old tokens for this email
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('email', verificationToken.email)
      .neq('id', verificationToken.id)

    // Redirect to success page
    return NextResponse.redirect(new URL('/verify-email?success=true', request.url))

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/verify-email?error=server_error', request.url))
  }
}
