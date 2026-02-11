import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * POST /api/kassa/register
 * 
 * KASSA-SPECIFIEKE registratie - APART van bestelplatform!
 * 
 * Maakt:
 * 1. Tenant record
 * 2. Business profile (met kassa_url)
 * 3. Install token voor VysionPrint app
 * 
 * Stuurt:
 * - Verificatie email
 * - Installatie instructies
 */

const JWT_SECRET = process.env.JWT_SECRET || process.env.INSTALL_TOKEN_SECRET || 'vysion-kassa-install-secret-2024'

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

function generateInstallToken(tenantId: string, businessId: string): string {
  return jwt.sign(
    { 
      tenantId, 
      businessId,
      type: 'KASSA_INSTALL',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token geldig voor 7 dagen
  )
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
      while (true) {
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
        if (counter > 100) {
          return NextResponse.json(
            { error: 'Kon geen unieke slug genereren' },
            { status: 400 }
          )
        }
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
        product_type: product || 'KASSA', // KASSA, BESTELPLATFORM, of BOTH
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
    const kassaURL = `https://frituurnolim.vercel.app/kassa?business=${tenant.business_id || tenant.id}`
    
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .insert({
        name: businessName.trim(),
        email: emailLower,
        password_hash: passwordHash,
        phone: phone.trim(),
        tenant_slug: tenantSlug,
        vat_number: vatNumber || null,
        kassa_url: kassaURL,
      })
      .select()
      .single()

    if (profileError) {
      logger.error('Error creating business profile', { requestId, error: profileError.message })
      // Rollback tenant
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { error: `Fout bij aanmaken account: ${profileError.message}` },
        { status: 500 }
      )
    }

    // 3. GENERATE INSTALL TOKEN
    const installToken = generateInstallToken(tenant.id, profile.id)

    // 4. STORE INSTALL TOKEN (voor validatie later)
    await supabase
      .from('install_tokens')
      .insert({
        token: installToken,
        tenant_id: tenant.id,
        business_id: profile.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dagen
        used: false,
      })
      .catch(() => {
        // Tabel bestaat misschien nog niet - geen probleem
        logger.warn('install_tokens table might not exist', { requestId })
      })

    // 5. SEND WELCOME EMAIL
    try {
      await sendKassaWelcomeEmail(emailLower, businessName.trim(), installToken)
    } catch (emailError) {
      logger.warn('Failed to send welcome email', { requestId, error: emailError })
    }

    // SUCCESS
    logger.info('Kassa registration successful', { 
      requestId, 
      tenantSlug, 
      tenantId: tenant.id,
    })
    
    return NextResponse.json({ 
      success: true,
      installToken,
      tenant: {
        id: tenant.id,
        name: businessName.trim(),
        slug: tenantSlug,
      },
      message: 'Account aangemaakt! Gebruik de installatiecode in de VysionPrint app.'
    })

  } catch (error) {
    logger.error('Kassa registration error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
    })
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

  const mailOptions = {
    from: `"Vysion Kassa" <${process.env.ZOHO_EMAIL}>`,
    to: email,
    subject: 'Welkom bij Vysion Kassa - Je activatiecode',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F97316; margin: 0;">Vysion<span style="color: #666; font-weight: normal;">Kassa</span></h1>
        </div>
        
        <h2 style="color: #333;">Welkom ${name}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Je Vysion Kassa account is aangemaakt. Volg deze stappen om te starten:
        </p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Stap 1: Download de app</h3>
          <p style="color: #555;">
            Download <strong>VysionPrint</strong> uit de App Store op je iPad of iPhone.
          </p>
          
          <h3 style="color: #333;">Stap 2: Voer je activatiecode in</h3>
          <p style="color: #555;">Open de app en voer deze code in:</p>
          
          <div style="background: white; border: 2px dashed #F97316; border-radius: 8px; padding: 15px; text-align: center; margin: 10px 0;">
            <code style="font-size: 14px; color: #333; word-break: break-all;">${installToken}</code>
          </div>
          
          <p style="color: #888; font-size: 12px;">Deze code is 7 dagen geldig.</p>
        </div>
        
        <p style="color: #555;">
          Na activatie is je kassa direct klaar voor gebruik!
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
        </p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
  logger.info('Kassa welcome email sent', { email })
}
