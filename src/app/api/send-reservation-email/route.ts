import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      reservationId, 
      status, 
      customerEmail, 
      customerName, 
      customerPhone,
      reservationDate, 
      reservationTime, 
      partySize,
      tenantSlug,
      businessName 
    } = body

    // Validate required fields
    if (!customerEmail || !customerName || !status) {
      return NextResponse.json(
        { error: 'Ontbrekende gegevens' },
        { status: 400 }
      )
    }

    // Get business info if not provided
    let finalBusinessName = businessName
    if (!finalBusinessName && tenantSlug) {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('business_name, phone, email')
        .eq('tenant_slug', tenantSlug)
        .single()
      
      if (business) {
        finalBusinessName = business.business_name
      }
    }

    finalBusinessName = finalBusinessName || 'Ons restaurant'

    // Format date nicely
    const dateObj = new Date(reservationDate)
    const formattedDate = dateObj.toLocaleDateString('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const formattedTime = reservationTime?.slice(0, 5) || ''

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

    let subject = ''
    let headerColor = ''
    let headerIcon = ''
    let mainMessage = ''
    let additionalInfo = ''

    if (status === 'confirmed') {
      subject = `Reservering bevestigd - ${finalBusinessName}`
      headerColor = '#22C55E'
      headerIcon = '✓'
      mainMessage = `Goed nieuws! Je reservering bij ${finalBusinessName} is bevestigd.`
      additionalInfo = `
        <p style="color: #22C55E; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0;">
          We verwachten je op ${formattedDate} om ${formattedTime}!
        </p>
      `
    } else if (status === 'cancelled') {
      subject = `Reservering geannuleerd - ${finalBusinessName}`
      headerColor = '#EF4444'
      headerIcon = '✕'
      mainMessage = `Helaas moeten we je reservering bij ${finalBusinessName} annuleren.`
      additionalInfo = `
        <p style="color: #666; text-align: center; margin: 20px 0;">
          Onze excuses voor het ongemak. Neem gerust contact met ons op voor een nieuwe reservering.
        </p>
      `
    } else {
      subject = `Reservering ontvangen - ${finalBusinessName}`
      headerColor = '#F97316'
      headerIcon = '📅'
      mainMessage = `Bedankt voor je reservering bij ${finalBusinessName}! We hebben je aanvraag ontvangen.`
      additionalInfo = `
        <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
          <p style="color: #C2410C; font-weight: 600; margin: 0;">
            ⏳ We bevestigen je reservering zo snel mogelijk per e-mail.
          </p>
        </div>
      `
    }

    const mailOptions = {
      from: `"${finalBusinessName}" <${process.env.ZOHO_EMAIL}>`,
      to: customerEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: ${headerColor}; padding: 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 30px; line-height: 60px;">
                ${headerIcon}
              </div>
              <h1 style="color: white; margin: 0; font-size: 24px;">
                ${status === 'confirmed' ? 'Reservering Bevestigd!' : status === 'cancelled' ? 'Reservering Geannuleerd' : 'Reservering Ontvangen'}
              </h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Beste ${customerName},
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${mainMessage}
              </p>

              <!-- Reservation Details Box -->
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">Reserveringsgegevens:</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #888; width: 100px;">Datum:</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #888;">Tijd:</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #888;">Personen:</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">${partySize} personen</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #888;">Naam:</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #888;">Telefoon:</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">${customerPhone}</td>
                  </tr>
                </table>
              </div>

              ${additionalInfo}

              <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
                Met vriendelijke groet,<br>
                <strong style="color: #333;">${finalBusinessName}</strong>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                Deze email is automatisch verzonden via Vysion Horeca
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${status === 'confirmed' ? 'Reservering Bevestigd!' : status === 'cancelled' ? 'Reservering Geannuleerd' : 'Reservering Ontvangen'}

Beste ${customerName},

${mainMessage}

Reserveringsgegevens:
- Datum: ${formattedDate}
- Tijd: ${formattedTime}
- Personen: ${partySize}
- Naam: ${customerName}
- Telefoon: ${customerPhone}

Met vriendelijke groet,
${finalBusinessName}
      `,
    }

    // Send email
    await transporter.sendMail(mailOptions)

    return NextResponse.json(
      { success: true, message: 'Email verzonden' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reservation email error:', error)
    return NextResponse.json(
      { error: 'Kon email niet verzenden' },
      { status: 500 }
    )
  }
}
