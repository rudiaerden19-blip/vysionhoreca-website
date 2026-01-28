import { NextRequest, NextResponse } from 'next/server'
import { isProtectedTenant } from '@/lib/protected-tenants'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { registerRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// Secure password hashing with bcrypt
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    // Rate limiting: 3 registrations per hour per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(registerRateLimiter, clientIP)
    
    if (!rateLimitResult.success) {
      logger.warn('Registration rate limited', { requestId, clientIP })
      return NextResponse.json(
        { error: 'Te veel registraties. Probeer het later opnieuw.' },
        { status: 429 }
      )
    }

    const { businessName, email, phone, password } = await request.json()

    if (!businessName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Alle velden zijn verplicht' },
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
      logger.error('Registration failed: Supabase not configured', { requestId })
      return NextResponse.json(
        { error: 'Database niet geconfigureerd. Neem contact op met support.' },
        { status: 503 }
      )
    }

    const emailLower = email.trim().toLowerCase()

    // Check if email already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle()

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Dit email adres is al in gebruik' },
        { status: 409 }
      )
    }

    // Generate tenant_slug from business name
    // Remove ALL spaces and special characters - slug is lowercase letters and numbers only
    let tenantSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')      // Remove everything except lowercase letters and numbers
    
    // Safety check - if somehow empty or too short, create fallback
    if (!tenantSlug || tenantSlug.length < 2) {
      tenantSlug = 'shop' + Date.now().toString(36)
    }

    // Check if slug already exists, add number if needed
    const { data: existingSlug } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (existingSlug) {
      // Find a unique slug by adding a number (no dash, just append number)
      let counter = 2
      let newSlug = `${tenantSlug}${counter}`
      
      while (true) {
        const { data: checkSlug } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', newSlug)
          .maybeSingle()
        
        if (!checkSlug) {
          tenantSlug = newSlug
          break
        }
        counter++
        newSlug = `${tenantSlug}${counter}`
        
        if (counter > 100) {
          return NextResponse.json(
            { error: 'Kon geen unieke slug genereren. Probeer een andere bedrijfsnaam.' },
            { status: 400 }
          )
        }
      }
    }

    const passwordHash = await hashPassword(password)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // ========================================
    // 1. CREATE TENANT (main table)
    // ========================================
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName.trim(),
        slug: tenantSlug,
        email: emailLower,
        phone: phone.trim(),
        plan: 'starter',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select()
      .single()

    if (tenantError) {
      logger.error('Error creating tenant', { requestId, error: tenantError.message })
      return NextResponse.json(
        { error: `Fout bij aanmaken tenant: ${tenantError.message}` },
        { status: 500 }
      )
    }

    logger.info('Tenant created', { requestId, tenantSlug, tenantId: tenant.id })

    // ========================================
    // 2. CREATE BUSINESS PROFILE (login account)
    // ========================================
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .insert({
        name: businessName.trim(),
        email: emailLower,
        password_hash: passwordHash,
        phone: phone.trim(),
        tenant_slug: tenantSlug,
      })
      .select()
      .single()

    if (profileError) {
      logger.error('Error creating business profile', { requestId, error: profileError.message, tenantSlug })
      // Rollback tenant (maar alleen als het geen beschermde tenant is)
      if (!isProtectedTenant(tenantSlug)) {
        await supabase.from('tenants').delete().eq('id', tenant.id)
      }
      return NextResponse.json(
        { error: `Fout bij aanmaken account: ${profileError.message}` },
        { status: 500 }
      )
    }

    logger.info('Business profile created', { requestId, profileId: profile.id, tenantSlug })

    // ========================================
    // 3. CREATE TENANT SETTINGS (shop settings)
    // ========================================
    const { error: settingsError } = await supabase
      .from('tenant_settings')
      .insert({
        tenant_slug: tenantSlug,
        business_name: businessName.trim(),
        email: emailLower,
        phone: phone.trim(),
        primary_color: '#FF6B35',
        secondary_color: '#1a1a2e',
      })

    if (settingsError) {
      logger.warn('Error creating tenant_settings', { requestId, error: settingsError.message, tenantSlug })
      // Don't fail - this is secondary
    }

    // ========================================
    // 4. CREATE SUBSCRIPTION
    // ========================================
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_slug: tenantSlug,
        plan: 'starter',
        status: 'trial',
        price_monthly: 79,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
      })

    if (subscriptionError) {
      logger.warn('Error creating subscription', { requestId, error: subscriptionError.message, tenantSlug })
      // Don't fail - this is secondary
    }

    // ========================================
    // 5. SEND VERIFICATION EMAIL
    // ========================================
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await supabase
        .from('email_verification_tokens')
        .insert({
          email: emailLower,
          token: verificationToken,
          expires_at: expiresAt.toISOString(),
        })

      await sendVerificationEmail(emailLower, businessName.trim(), verificationToken)
    } catch (emailError) {
      logger.warn('Failed to send verification email', { 
        requestId, 
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        email: emailLower 
      })
      // Don't fail registration - email can be resent
    }

    // ========================================
    // SUCCESS
    // ========================================
    logger.info('Registration successful', { 
      requestId, 
      tenantSlug, 
      tenantId: tenant.id,
      duration: Date.now() - startTime 
    })
    
    return NextResponse.json({ 
      success: true,
      tenant: {
        id: tenant.id,
        name: businessName.trim(),
        email: emailLower,
        tenant_slug: tenantSlug,
      },
      message: 'Account aangemaakt! Check je email om je account te bevestigen.'
    })

  } catch (error) {
    logger.error('Registration error', { 
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
    subject: 'Welkom bij Vysion Horeca - Bevestig je email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F97316; margin: 0;">Vysion<span style="color: #666; font-weight: normal;">horeca</span></h1>
        </div>
        
        <h2 style="color: #333;">Welkom ${name}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Bedankt voor je registratie bij Vysion Horeca! Je proefperiode van 14 dagen is gestart.
        </p>
        
        <p style="color: #555; line-height: 1.6;">
          Klik op de knop hieronder om je emailadres te bevestigen:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #F97316; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold;
                    display: inline-block;">
            Email bevestigen
          </a>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Wat kun je nu doen?</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li>Producten toevoegen aan je menu</li>
            <li>Je online shop personaliseren</li>
            <li>QR-codes genereren voor tafels</li>
            <li>Bestellingen ontvangen</li>
          </ul>
        </div>
        
        <p style="color: #888; font-size: 14px;">
          Deze verificatie link is 24 uur geldig.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
        </p>
      </div>
    `,
    text: `
Welkom ${name}!

Bedankt voor je registratie bij Vysion Horeca! Je proefperiode van 14 dagen is gestart.

Klik op deze link om je emailadres te bevestigen:
${verifyUrl}

Deze link is 24 uur geldig.

© ${new Date().getFullYear()} Vysion Group
    `,
  }

  await transporter.sendMail(mailOptions)
  logger.info('Verification email sent', { email })
}
