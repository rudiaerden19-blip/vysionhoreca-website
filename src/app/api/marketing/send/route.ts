import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { 
      tenantSlug, 
      recipients, 
      subject, 
      message, 
      includePromo, 
      promoCode, 
      promoDiscount,
      businessName 
    } = await request.json()

    if (!tenantSlug || !recipients || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients' },
        { status: 400 }
      )
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    })

    // Build promo code HTML if included
    let promoHtml = ''
    if (includePromo && promoCode) {
      promoHtml = `
        <div style="background: linear-gradient(135deg, #F97316, #FB923C); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">🎁 EXCLUSIEVE KORTING</p>
          <p style="margin: 10px 0; font-size: 32px; font-weight: bold;">${promoDiscount}% KORTING</p>
          <p style="margin: 0; font-size: 12px;">Gebruik code:</p>
          <p style="margin: 10px 0; font-size: 24px; font-weight: bold; background: white; color: #F97316; padding: 10px 20px; border-radius: 8px; display: inline-block;">${promoCode}</p>
        </div>
      `
    }

    // Unsubscribe URL voor GDPR compliance
    const unsubscribeUrl = `https://www.vysionhoreca.com/shop/${tenantSlug}/account?unsubscribe=true`
    
    // Send emails met vertraging om spam filters te vermijden
    const results: PromiseSettledResult<string>[] = []
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i] as { email: string; name: string }
      
      // Voeg kleine vertraging toe tussen emails (500ms per email)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      try {
        const personalizedMessage = message.replace(/Beste klant/g, `Beste ${recipient.name}`)
        
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
      <h1 style="color: white; margin: 0; font-size: 24px;">${businessName || 'Vysion Horeca'}</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      ${personalizedMessage.split('\n').map((line: string) => 
        line.trim() ? `<p style="margin: 0 0 15px 0; color: #333; line-height: 1.6; font-size: 15px;">${line}</p>` : '<br>'
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
        Je ontvangt deze email omdat je klant bent bij ${businessName || 'ons'}.
      </p>
      <p style="margin: 0 0 10px 0;">
        <a href="${unsubscribeUrl}" style="color: #888; text-decoration: underline;">
          Uitschrijven voor marketing emails
        </a>
      </p>
      <p style="margin: 0; color: #aaa;">
        © ${new Date().getFullYear()} ${businessName || 'Vysion Horeca'} | Powered by Vysion Horeca
      </p>
    </div>
  </div>
</body>
</html>
        `

        // Verstuur email met extra headers om spam te voorkomen
        await transporter.sendMail({
          from: `"${businessName || 'Vysion Horeca'}" <${process.env.ZOHO_EMAIL}>`,
          to: recipient.email,
          subject: subject,
          html: htmlContent,
          text: `${personalizedMessage}\n\n---\nUitschrijven: ${unsubscribeUrl}`,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'Precedence': 'bulk',
            'X-Mailer': 'Vysion Horeca Marketing',
          },
        })

        results.push({ status: 'fulfilled', value: recipient.email })
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error)
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
        promo_discount: includePromo ? parseInt(promoDiscount) : null,
        status: failedCount === 0 ? 'sent' : 'partial',
        sent_at: new Date().toISOString(),
      })
    }

    console.log(`Marketing emails sent: ${successCount} success, ${failedCount} failed`)

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
    })

  } catch (error) {
    console.error('Marketing email error:', error)
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    )
  }
}
