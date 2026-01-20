import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { contactRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 contact messages per hour per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(contactRateLimiter, clientIP)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Te veel berichten verstuurd. Probeer het later opnieuw.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, message } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: 'Alle velden zijn verplicht' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ongeldig email adres' },
        { status: 400 }
      )
    }

    // Create transporter with Zoho SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    })

    // Email content
    const mailOptions = {
      from: `"Vysion Horeca Website" <${process.env.ZOHO_EMAIL}>`,
      to: process.env.ZOHO_EMAIL,
      replyTo: email,
      subject: `Nieuw contactformulier: ${firstName} ${lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F97316; border-bottom: 2px solid #F97316; padding-bottom: 10px;">
            Nieuw bericht via contactformulier
          </h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; background: #f5f5f5; font-weight: bold; width: 120px;">Voornaam:</td>
              <td style="padding: 10px; background: #fafafa;">${firstName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Achternaam:</td>
              <td style="padding: 10px; background: #fafafa;">${lastName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Email:</td>
              <td style="padding: 10px; background: #fafafa;">
                <a href="mailto:${email}" style="color: #F97316;">${email}</a>
              </td>
            </tr>
          </table>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333;">Bericht:</h3>
            <p style="white-space: pre-wrap; color: #555; line-height: 1.6;">${message}</p>
          </div>
          
          <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
            Dit bericht werd verstuurd via het contactformulier op vysionhoreca.com
          </p>
        </div>
      `,
      text: `
Nieuw bericht via contactformulier

Voornaam: ${firstName}
Achternaam: ${lastName}
Email: ${email}

Bericht:
${message}

---
Dit bericht werd verstuurd via het contactformulier op vysionhoreca.com
      `,
    }

    // Send email
    await transporter.sendMail(mailOptions)

    return NextResponse.json(
      { success: true, message: 'Bericht succesvol verzonden' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het versturen. Probeer het later opnieuw.' },
      { status: 500 }
    )
  }
}
