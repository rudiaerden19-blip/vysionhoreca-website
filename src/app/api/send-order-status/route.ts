import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      customerEmail, 
      customerName, 
      orderNumber, 
      status, 
      businessName,
      businessEmail,
      rejectionReason,
      rejectionNotes,
      total
    } = body

    if (!customerEmail || !orderNumber || !status || !businessName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    })

    let subject = ''
    let statusText = ''
    let statusColor = ''
    let statusEmoji = ''
    let additionalInfo = ''

    switch (status) {
      case 'confirmed':
        subject = `✅ Bestelling #${orderNumber} bevestigd - ${businessName}`
        statusText = 'Je bestelling is bevestigd en wordt nu bereid!'
        statusColor = '#22c55e'
        statusEmoji = '✅'
        break
      case 'ready':
        subject = `🎉 Bestelling #${orderNumber} is klaar! - ${businessName}`
        statusText = 'Je bestelling is klaar om opgehaald te worden!'
        statusColor = '#22c55e'
        statusEmoji = '🎉'
        break
      case 'rejected':
        subject = `❌ Bestelling #${orderNumber} geannuleerd - ${businessName}`
        statusText = 'Helaas kunnen we je bestelling niet verwerken.'
        statusColor = '#ef4444'
        statusEmoji = '❌'
        if (rejectionReason) {
          const reasonLabels: Record<string, string> = {
            'busy': 'We zijn op dit moment te druk',
            'closed': 'We zijn gesloten',
            'no_stock': 'Product(en) niet op voorraad',
            'technical': 'Technisch probleem',
            'address': 'Adres niet bezorgbaar',
            'other': 'Andere reden',
          }
          additionalInfo = `<p style="color: #666;">Reden: ${reasonLabels[rejectionReason] || rejectionReason}</p>`
          if (rejectionNotes) {
            additionalInfo += `<p style="color: #666;">${rejectionNotes}</p>`
          }
        }
        break
      default:
        subject = `Bestelling #${orderNumber} update - ${businessName}`
        statusText = `Status: ${status}`
        statusColor = '#f97316'
        statusEmoji = '📦'
    }

    const mailOptions = {
      from: `"${businessName}" <${process.env.ZOHO_EMAIL}>`,
      to: customerEmail,
      replyTo: businessEmail || process.env.ZOHO_EMAIL,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 30px; background: ${statusColor}; border-radius: 16px 16px 0 0;">
            <span style="font-size: 64px;">${statusEmoji}</span>
            <h1 style="color: white; margin: 20px 0 10px; font-size: 28px;">Bestelling #${orderNumber}</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 0;">${statusText}</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 16px 16px;">
            <p style="font-size: 16px; color: #333;">Beste ${customerName || 'klant'},</p>
            
            ${additionalInfo}
            
            ${total ? `
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Totaalbedrag: €${parseFloat(total).toFixed(2)}</strong>
              </div>
            ` : ''}
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Vragen? Neem contact op met ${businessName}.
            </p>
          </div>
          
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            Powered by Vysion Horeca
          </p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order status email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
