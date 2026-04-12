import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { parseJsonBody, jsonServerError } from '@/lib/api-request'
import { marketingSendSchema } from '@/lib/api-schemas'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const clientIP = getClientIP(request)
    const rl = await checkRateLimit(apiRateLimiter, `marketing:${clientIP}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
        { status: 429 }
      )
    }

    const parsed = await parseJsonBody(request, marketingSendSchema)
    if (!parsed.ok) return parsed.response

    const {
      tenantSlug,
      recipients,
      subject,
      message,
      includePromo,
      promoCode,
      promoDiscount,
      businessName,
    } = parsed.data

    // Verify user is logged in via any auth header
    const businessId = request.headers.get('x-business-id')
    const superadminId = request.headers.get('x-superadmin-id')
    if (!businessId && !superadminId) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    // Haal tenant SMTP instellingen op
    const supabaseAdmin = getServerSupabaseClient()
    let smtpHost = 'smtp.zoho.eu'
    let smtpPort = 465
    let smtpUser = process.env.ZOHO_EMAIL || ''
    let smtpPass = process.env.ZOHO_PASSWORD || ''
    let fromName = businessName || 'Vysion Horeca'

    if (supabaseAdmin) {
      const { data: smtpSettings } = await supabaseAdmin
        .from('tenant_settings')
        .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name')
        .eq('tenant_slug', tenantSlug)
        .single()

      if (smtpSettings?.smtp_host && smtpSettings?.smtp_user && smtpSettings?.smtp_password) {
        smtpHost = smtpSettings.smtp_host
        smtpPort = smtpSettings.smtp_port || 465
        smtpUser = smtpSettings.smtp_user
        smtpPass = smtpSettings.smtp_password
        fromName = smtpSettings.smtp_from_name || businessName || 'Vysion Horeca'
      } else if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
        return NextResponse.json(
          { error: 'Geen email ingesteld. Ga naar Profiel → Email instellingen en vul je emailgegevens in.' },
          { status: 400 }
        )
      }
    }

    // Create email transporter met tenant eigen of centrale SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Build promo code HTML if included
    let promoHtml = ''
    if (includePromo && promoCode) {
      promoHtml = `
        <div style="background: linear-gradient(135deg, #F97316, #FB923C); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">🎁 EXCLUSIEVE KORTING</p>
          <p style="margin: 10px 0; font-size: 32px; font-weight: bold;">${escapeHtml(String(promoDiscount ?? ''))}% KORTING</p>
          <p style="margin: 0; font-size: 12px;">Gebruik code:</p>
          <p style="margin: 10px 0; font-size: 24px; font-weight: bold; background: white; color: #F97316; padding: 10px 20px; border-radius: 8px; display: inline-block;">${escapeHtml(promoCode ?? '')}</p>
        </div>
      `
    }

    // Unsubscribe URL voor GDPR compliance
    const unsubscribeUrl = `https://www.vysionhoreca.com/shop/${tenantSlug}/account?unsubscribe=true`
    
    // Send emails met vertraging om spam filters te vermijden
    const results: PromiseSettledResult<string>[] = []
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]
      
      // Voeg kleine vertraging toe tussen emails (500ms per email)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      try {
        const safeName = recipient.name?.trim() || 'klant'
        const personalizedMessage = message.replace(/Beste klant/g, `Beste ${safeName}`)
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header met logo/naam -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${escapeHtml(businessName || 'Vysion Horeca')}</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      ${personalizedMessage.split('\n').map((line: string) => 
        line.trim() ? `<p style="margin: 0 0 15px 0; color: #333; line-height: 1.6; font-size: 15px;">${escapeHtml(line)}</p>` : '<br>'
      ).join('')}
      
      ${promoHtml}
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.vysionhoreca.com/shop/${tenantSlug}" 
           style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Bekijk onze website
        </a>
      </div>
    </div>
    
    <!-- Footer met unsubscribe -->
    <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">
        Je ontvangt deze email omdat je klant bent bij ${escapeHtml(businessName || 'ons')}.
      </p>
      <p style="margin: 0 0 10px 0;">
        <a href="${unsubscribeUrl}" style="color: #888; text-decoration: underline;">
          Uitschrijven voor marketing emails
        </a>
      </p>
      <p style="margin: 0; color: #aaa;">
        © ${new Date().getFullYear()} ${escapeHtml(businessName || 'Vysion Horeca')} | Powered by Vysion Horeca
      </p>
    </div>
  </div>
</body>
</html>
        `

        await transporter.sendMail({
          from: `"${fromName}" <${smtpUser}>`,
          replyTo: smtpUser,
          to: recipient.email,
          subject: subject,
          html: htmlContent,
          text: `${personalizedMessage}\n\n---\nUitschrijven: ${unsubscribeUrl}`,
          headers: {
            'List-Unsubscribe': `<mailto:${smtpUser}?subject=uitschrijven>, <${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })

        results.push({ status: 'fulfilled', value: recipient.email })
      } catch (error) {
        logger.warn('Failed to send marketing email', { 
          requestId, 
          email: recipient.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        results.push({ status: 'rejected', reason: error })
      }
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failedCount = results.filter(r => r.status === 'rejected').length

    // Save campaign to database
    const supabase = getServerSupabaseClient()
    if (supabase) {
      await supabase.from('marketing_campaigns').insert({
        tenant_slug: tenantSlug,
        subject: subject,
        message: message,
        recipient_count: successCount,
        promo_code: includePromo ? promoCode : null,
        promo_discount: includePromo && promoDiscount != null ? promoDiscount : null,
        status: failedCount === 0 ? 'sent' : 'partial',
        sent_at: new Date().toISOString(),
      })
    }

    logger.info('Marketing campaign sent', { 
      requestId, 
      tenantSlug, 
      successCount, 
      failedCount 
    })

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
    })

  } catch (error) {
    logger.error('Marketing email error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return jsonServerError('Failed to send emails')
  }
}
