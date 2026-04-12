import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { contactRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { parseJsonBody, jsonServerError } from '@/lib/api-request'
import { contactFormSchema } from '@/lib/api-schemas'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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

    const parsed = await parseJsonBody(request, contactFormSchema)
    if (!parsed.ok) return parsed.response

    const { firstName, lastName, email, message } = parsed.data
    const fn = escapeHtml(firstName)
    const ln = escapeHtml(lastName)
    const em = escapeHtml(email)
    const msg = escapeHtml(message)

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
      subject: `Nieuw contactformulier: ${fn} ${ln}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F97316; border-bottom: 2px solid #F97316; padding-bottom: 10px;">
            Nieuw bericht via contactformulier
          </h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; background: #f5f5f5; font-weight: bold; width: 120px;">Voornaam:</td>
              <td style="padding: 10px; background: #fafafa;">${fn}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Achternaam:</td>
              <td style="padding: 10px; background: #fafafa;">${ln}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Email:</td>
              <td style="padding: 10px; background: #fafafa;">
                <a href="mailto:${em}" style="color: #F97316;">${em}</a>
              </td>
            </tr>
          </table>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333;">Bericht:</h3>
            <p style="white-space: pre-wrap; color: #555; line-height: 1.6;">${msg}</p>
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
    return jsonServerError('Er ging iets mis bij het versturen. Probeer het later opnieuw.')
  }
}
