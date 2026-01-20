import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

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

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is verplicht' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service tijdelijk niet beschikbaar' },
        { status: 503 }
      )
    }

    const emailLower = email.trim().toLowerCase()

    // Check if email exists and is not verified
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('id, email, name, email_verified')
      .eq('email', emailLower)
      .maybeSingle()

    // Always return success to prevent email enumeration
    if (!profile) {
      return NextResponse.json({
        success: true,
        message: 'Als dit emailadres bij ons bekend is, ontvang je een verificatie email.',
      })
    }

    if (profile.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Je email is al geverifieerd. Je kunt inloggen.',
      })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Delete old tokens
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('email', emailLower)

    // Store new token
    await supabase
      .from('email_verification_tokens')
      .insert({
        email: emailLower,
        token: token,
        expires_at: expiresAt.toISOString(),
      })

    // Send verification email
    await sendVerificationEmail(emailLower, profile.name || 'Gebruiker', token)

    return NextResponse.json({
      success: true,
      message: 'Verificatie email verzonden!',
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

async function sendVerificationEmail(email: string, name: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vysionhoreca.com'}/api/auth/verify-email?token=${token}`

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
    subject: 'Bevestig je emailadres - Vysion Horeca',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F97316; margin: 0;">Vysion<span style="color: #666; font-weight: normal;">horeca</span></h1>
        </div>
        
        <h2 style="color: #333;">Welkom ${name}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Bedankt voor je registratie bij Vysion Horeca. 
          Klik op de onderstaande knop om je emailadres te bevestigen:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #F97316; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold;
                    display: inline-block;">
            Email bevestigen
          </a>
        </div>
        
        <p style="color: #888; font-size: 14px; line-height: 1.6;">
          Deze link is 24 uur geldig. Na bevestiging kun je volledig gebruikmaken van je account.
        </p>
        
        <p style="color: #888; font-size: 14px;">
          Of kopieer deze link:<br>
          <a href="${verifyUrl}" style="color: #F97316; word-break: break-all;">${verifyUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
        </p>
      </div>
    `,
    text: `
Welkom ${name}!

Bedankt voor je registratie bij Vysion Horeca.

Klik op deze link om je emailadres te bevestigen:
${verifyUrl}

Deze link is 24 uur geldig.

© ${new Date().getFullYear()} Vysion Group
    `,
  }

  await transporter.sendMail(mailOptions)
  console.log('Verification email sent to:', email)
}
