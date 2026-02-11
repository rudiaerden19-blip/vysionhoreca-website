import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * POST /api/kassa/register
 * 
 * KASSA-SPECIFIEKE registratie - APART van bestelplatform!
 */

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

function generateInstallToken(): string {
  // Genereer een veilige random token (geen JWT nodig)
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const { businessName, email, phone, password, vatNumber, product } = await request.json()

    // Validatie
    if (!businessName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Alle verplichte velden moeten ingevuld zijn' },
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
      return NextResponse.json(
        { error: 'Database niet geconfigureerd' },
        { status: 503 }
      )
    }

    const emailLower = email.trim().toLowerCase()

    // Check of email al bestaat
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

    // Genereer slug
    let tenantSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')

    if (!tenantSlug || tenantSlug.length < 2) {
      tenantSlug = 'kassa' + Date.now().toString(36)
    }

    // Check unieke slug
    const { data: existingSlug } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (existingSlug) {
      let counter = 2
      while (counter < 100) {
        const newSlug = `${tenantSlug}${counter}`
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
      }
    }

    const passwordHash = await hashPassword(password)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // 1. CREATE TENANT
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName.trim(),
        slug: tenantSlug,
        email: emailLower,
        phone: phone.trim(),
        vat_number: vatNumber || null,
        plan: 'starter',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select()
      .single()

    if (tenantError) {
      logger.error('Error creating tenant', { requestId, error: tenantError.message })
      return NextResponse.json(
        { error: `Fout bij aanmaken: ${tenantError.message}` },
        { status: 500 }
      )
    }

    // 2. CREATE BUSINESS PROFILE
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .insert({
        name: businessName.trim(),
        email: emailLower,
        password_hash: passwordHash,
        phone: phone.trim(),
        tenant_slug: tenantSlug,
        vat_number: vatNumber || null,
      })
      .select()
      .single()

    if (profileError) {
      logger.error('Error creating business profile', { requestId, error: profileError.message })
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { error: `Fout bij aanmaken account: ${profileError.message}` },
        { status: 500 }
      )
    }

    // 3. GENERATE INSTALL TOKEN
    const installToken = generateInstallToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dagen

    // 4. STORE INSTALL TOKEN (optioneel - tabel bestaat misschien nog niet)
    const { error: tokenError } = await supabase
      .from('install_tokens')
      .insert({
        token: installToken,
        tenant_id: tenant.id,
        business_id: profile.id,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
    
    if (tokenError) {
      logger.warn('Could not store install token', { requestId, error: tokenError.message })
    }

    // 5. SEND WELCOME EMAIL
    try {
      await sendKassaWelcomeEmail(emailLower, businessName.trim(), installToken)
    } catch (emailError) {
      logger.warn('Failed to send welcome email', { requestId })
    }

    // SUCCESS
    logger.info('Kassa registration successful', { requestId, tenantSlug })
    
    return NextResponse.json({ 
      success: true,
      installToken,
      tenant: {
        id: tenant.id,
        name: businessName.trim(),
        slug: tenantSlug,
      },
    })

  } catch (error) {
    logger.error('Kassa registration error', { requestId, error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

async function sendKassaWelcomeEmail(email: string, name: string, installToken: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: `"Vysion Kassa" <${process.env.ZOHO_EMAIL}>`,
    to: email,
    subject: 'Welkom bij Vysion Kassa - Je activatiecode',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #F97316;">Vysion<span style="color: #666; font-weight: normal;">Kassa</span></h1>
        
        <h2>Welkom ${name}!</h2>
        
        <p>Je Vysion Kassa account is aangemaakt. Volg deze stappen:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Stap 1: Download de app</h3>
          <p>Download <strong>VysionPrint</strong> uit de App Store op je iPad of iPhone.</p>
          
          <h3>Stap 2: Voer je activatiecode in</h3>
          <div style="background: white; border: 2px dashed #F97316; border-radius: 8px; padding: 15px; text-align: center;">
            <code style="font-size: 14px;">${installToken}</code>
          </div>
          <p style="color: #888; font-size: 12px;">Deze code is 7 dagen geldig.</p>
        </div>
        
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} Vysion Group</p>
      </div>
    `,
  })
}
