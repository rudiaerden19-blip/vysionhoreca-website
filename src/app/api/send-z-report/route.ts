import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      to,
      subject,
      businessName,
      businessAddress,
      btwNumber,
      formattedDate,
      orderCount,
      subtotal,
      tax,
      btwPercentage,
      total,
      cashPayments,
      cardPayments,
      onlinePayments,
    } = body

    if (!to) {
      return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 })
    }

    // Create transporter with Zoho SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    })

    const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0 0 5px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.8; font-size: 14px; }
          .content { padding: 30px; }
          .section { margin-bottom: 25px; }
          .section-title { font-weight: bold; color: #1a1a2e; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
          .row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #1a1a2e; padding-top: 15px; margin-top: 10px; }
          .row .amount { color: #22c55e; font-weight: 600; }
          .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #666; }
          .badge { display: inline-block; background: #22c55e; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${businessName}</h1>
            ${businessAddress ? `<p>${businessAddress}</p>` : ''}
            ${btwNumber ? `<p>BTW: ${btwNumber}</p>` : ''}
            <div style="margin-top: 15px;">
              <span class="badge">Z-RAPPORT</span>
            </div>
            <p style="margin-top: 10px; font-weight: bold;">${formattedDate}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">📊 OMZET</div>
              <div class="row">
                <span>Aantal transacties:</span>
                <span>${orderCount}</span>
              </div>
              <div class="row">
                <span>Subtotaal (excl. BTW):</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              <div class="row">
                <span>BTW ${btwPercentage}%:</span>
                <span>${formatCurrency(tax)}</span>
              </div>
              <div class="row total">
                <span>TOTAAL:</span>
                <span class="amount">${formatCurrency(total)}</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">💳 BETALINGEN</div>
              <div class="row">
                <span>💵 Contant:</span>
                <span>${formatCurrency(cashPayments)}</span>
              </div>
              <div class="row">
                <span>💳 PIN/Kaart:</span>
                <span>${formatCurrency(cardPayments)}</span>
              </div>
              <div class="row">
                <span>🌐 Online:</span>
                <span>${formatCurrency(onlinePayments)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Dit is een automatisch gegenereerd Z-Rapport</p>
            <p>Gegenereerd op: ${new Date().toLocaleString('nl-NL')}</p>
            <p style="margin-top: 10px;">Powered by <strong>Vysion Horeca</strong></p>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"${businessName || 'Vysion Horeca'}" <${process.env.ZOHO_EMAIL}>`,
      to: to,
      subject: subject || `Z-Rapport - ${businessName}`,
      html: htmlContent,
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error sending Z-report email:', error)
    return NextResponse.json(
      { error: 'Fout bij versturen e-mail', message: error instanceof Error ? error.message : 'Onbekende fout' },
      { status: 500 }
    )
  }
}
