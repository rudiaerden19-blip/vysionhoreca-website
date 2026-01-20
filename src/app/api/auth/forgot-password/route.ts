import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: prevent abuse
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(apiRateLimiter, clientIP)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
        { status: 429 }
      )
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is verplicht' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      console.error('Forgot password failed: Supabase not configured')
      return NextResponse.json(
        { error: 'Service tijdelijk niet beschikbaar' },
        { status: 503 }
      )
    }

    const emailLower = email.trim().toLowerCase()

    // Check if email exists in business_profiles
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('id, email, name')
      .eq('email', emailLower)
      .maybeSingle()

    // Always return success to prevent email enumeration attacks
    // But only send email if account exists
    if (profile) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Delete any existing tokens for this email
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('email', emailLower)

      // Store token
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          email: emailLower,
          token: token,
          expires_at: expiresAt.toISOString(),
        })

      if (tokenError) {
        console.error('Failed to create reset token:', tokenError)
        // Still return success to prevent enumeration
      } else {
        // Send email
        await sendResetEmail(emailLower, profile.name || 'Gebruiker', token)
      }
    }

    // Always return success message
    return NextResponse.json({
      success: true,
      message: 'Als dit emailadres bij ons bekend is, ontvang je een reset link.',
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

async function sendResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vysionhoreca.com'}/login/reset-password?token=${token}`

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_PASSWORD,
    },
  })

  const mailOptions = {
    from: `"Vysion Horeca" <${process.env.ZOHO_EMAIL}>`,
    to: email,
    subject: 'Wachtwoord resetten - Vysion Horeca',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F97316; margin: 0;">Vysion<span style="color: #666; font-weight: normal;">horeca</span></h1>
        </div>
        
        <h2 style="color: #333;">Hallo ${name},</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Je hebt een verzoek ingediend om je wachtwoord te resetten. 
          Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #F97316; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold;
                    display: inline-block;">
            Wachtwoord resetten
          </a>
        </div>
        
        <p style="color: #888; font-size: 14px; line-height: 1.6;">
          Deze link is 1 uur geldig. Als je geen wachtwoord reset hebt aangevraagd, 
          kun je deze email negeren.
        </p>
        
        <p style="color: #888; font-size: 14px;">
          Of kopieer deze link:<br>
          <a href="${resetUrl}" style="color: #F97316; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
        </p>
      </div>
    `,
    text: `
Hallo ${name},

Je hebt een verzoek ingediend om je wachtwoord te resetten.

Klik op deze link om een nieuw wachtwoord in te stellen:
${resetUrl}

Deze link is 1 uur geldig.

Als je geen wachtwoord reset hebt aangevraagd, kun je deze email negeren.

© ${new Date().getFullYear()} Vysion Group
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('Password reset email sent to:', email)
  } catch (error) {
    console.error('Failed to send reset email:', error)
    throw error
  }
}
