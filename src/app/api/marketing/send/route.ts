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

    // Send emails to all recipients
    const results = await Promise.allSettled(
      recipients.map(async (recipient: { email: string; name: string }) => {
        const personalizedMessage = message.replace(/Beste klant/g, `Beste ${recipient.name}`)
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #F97316; margin: 0;">${businessName || 'Vysion Horeca'}</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 12px;">
              ${personalizedMessage.split('\n').map(line => `<p style="margin: 0 0 15px 0; color: #333; line-height: 1.6;">${line}</p>`).join('')}
            </div>
            
            ${promoHtml}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Je ontvangt deze email omdat je een account hebt bij ${businessName || 'ons'}.
              <br>
              © ${new Date().getFullYear()} ${businessName || 'Vysion Horeca'}
            </p>
          </div>
        `

        await transporter.sendMail({
          from: `"${businessName || 'Vysion Horeca'}" <${process.env.ZOHO_EMAIL}>`,
          to: recipient.email,
          subject: subject,
          html: htmlContent,
          text: personalizedMessage,
        })

        return recipient.email
      })
    )

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
