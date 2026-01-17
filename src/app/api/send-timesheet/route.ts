import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, message, csvData, fileName, staffName, month, year } = body
    
    if (!to || !subject || !csvData) {
      return NextResponse.json({ error: 'Missende velden' }, { status: 400 })
    }
    
    // Create transporter with Zoho SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL || 'info@vysionhoreca.com',
        pass: process.env.ZOHO_PASSWORD || '',
      },
    })
    
    // Create HTML email body
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
          .summary { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📅 Urenregistratie</h1>
            <p style="margin: 10px 0 0 0;">${staffName} - ${month} ${year}</p>
          </div>
          <div class="content">
            <p>${message.replace(/\n/g, '<br>')}</p>
            <div class="summary">
              <p style="margin: 0 0 10px 0; font-weight: bold;">📎 Bijgevoegd bestand:</p>
              <p style="margin: 0; color: #6b7280;">${fileName}</p>
            </div>
          </div>
          <div class="footer">
            Verzonden via Vysion Horeca<br>
            <a href="https://www.vysionhoreca.com" style="color: #f97316;">www.vysionhoreca.com</a>
          </div>
        </div>
      </body>
      </html>
    `
    
    // Send email with attachment
    await transporter.sendMail({
      from: `"Vysion Horeca" <${process.env.ZOHO_EMAIL || 'info@vysionhoreca.com'}>`,
      to,
      subject,
      text: message,
      html: htmlMessage,
      attachments: [
        {
          filename: fileName,
          content: csvData,
          contentType: 'text/csv',
        },
      ],
    })
    
    return NextResponse.json({ success: true, message: 'Email verzonden' })
  } catch (error) {
    console.error('Error sending timesheet email:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het verzenden' },
      { status: 500 }
    )
  }
}
