import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerEmail,
      customerName,
      customerPhone,
      reservationDate,
      reservationTime,
      partySize,
      tableName,
      notes,
      specialRequests,
      occasion,
      status,
      businessName,
      businessPhone,
      businessEmail,
      cancellationReason,
      reviewLink,
    } = body

    // 🔍 Logging: toon altijd wie de email triggert
    console.log('[send-reservation-email] Aangeroepen:', {
      status,
      customerEmail,
      customerName,
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent')?.slice(0, 80),
    })

    if (!customerEmail || !customerName) {
      return NextResponse.json({ error: 'Email en naam zijn verplicht' }, { status: 400 })
    }

    // ✅ Enkel toegestane statussen — blokkeer alles anders
    const allowed = ['confirmed', 'pending', 'cancelled', 'reminder', 'review']
    if (!allowed.includes(status)) {
      console.warn('[send-reservation-email] GEBLOKKEERD: ongeldige status:', status)
      return NextResponse.json({ error: 'Ongeldige status — email niet verstuurd' }, { status: 400 })
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

    const formattedDate = new Date(reservationDate).toLocaleDateString('nl-BE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    let subject = ''
    let headerColor = '#3C4D6B'
    let headerEmoji = '📅'
    let headerText = ''
    let bodyText = ''

    if (status === 'confirmed') {
      subject = `✅ Reservatie bevestigd - ${businessName}`
      headerColor = '#22c55e'
      headerEmoji = '✅'
      headerText = 'Reservatie Bevestigd!'
      bodyText = `Uw reservatie is bevestigd. We kijken ernaar uit u te verwelkomen!`
    } else if (status === 'cancelled') {
      subject = `❌ Reservatie geannuleerd - ${businessName}`
      headerColor = '#ef4444'
      headerEmoji = '❌'
      headerText = 'Reservatie Geannuleerd'
      bodyText = cancellationReason || 'Uw reservatie werd geannuleerd.'
    } else if (status === 'reminder') {
      subject = `⏰ Herinnering: Uw reservatie morgen - ${businessName}`
      headerColor = '#f59e0b'
      headerEmoji = '⏰'
      headerText = 'Herinnering Reservatie'
      bodyText = 'Dit is een herinnering voor uw reservatie morgen.'
    } else if (status === 'review') {
      subject = `⭐ Hoe was uw bezoek? - ${businessName}`
      headerColor = '#f59e0b'
      headerEmoji = '⭐'
      headerText = 'Bedankt voor uw bezoek!'
      bodyText = `We hopen dat u heeft genoten van uw bezoek bij ${businessName}. We stellen uw mening zeer op prijs!`
    } else {
      subject = `📅 Reservatie ontvangen - ${businessName}`
      headerColor = '#3C4D6B'
      headerEmoji = '📅'
      headerText = 'Reservatie Ontvangen'
      bodyText = 'We hebben uw reservatie ontvangen en nemen zo snel mogelijk contact op.'
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 30px; background: ${headerColor}; border-radius: 16px 16px 0 0;">
          <span style="font-size: 64px;">${headerEmoji}</span>
          <h1 style="color: white; margin: 20px 0 10px; font-size: 28px;">${headerText}</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">${businessName}</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Beste ${customerName},</p>
          <p style="font-size: 15px; color: #555; margin-bottom: 25px;">${bodyText}</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #166534; font-size: 16px;">📋 Reservatiedetails</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #555; width: 40%;"><strong>📅 Datum</strong></td>
                <td style="padding: 8px 0; color: #333;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555;"><strong>🕐 Tijd</strong></td>
                <td style="padding: 8px 0; color: #333;">${reservationTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555;"><strong>👥 Personen</strong></td>
                <td style="padding: 8px 0; color: #333;">${partySize} ${partySize === 1 ? 'persoon' : 'personen'}</td>
              </tr>
              ${tableName ? `<tr><td style="padding: 8px 0; color: #555;"><strong>🪑 Tafel</strong></td><td style="padding: 8px 0; color: #333;">Tafel ${tableName}</td></tr>` : ''}
              ${occasion ? `<tr><td style="padding: 8px 0; color: #555;"><strong>🎉 Gelegenheid</strong></td><td style="padding: 8px 0; color: #333;">${occasion}</td></tr>` : ''}
              ${notes ? `<tr><td style="padding: 8px 0; color: #555;"><strong>📝 Opmerking</strong></td><td style="padding: 8px 0; color: #333;">${notes}</td></tr>` : ''}
              ${specialRequests ? `<tr><td style="padding: 8px 0; color: #555;"><strong>⚠️ Wensen</strong></td><td style="padding: 8px 0; color: #333;">${specialRequests}</td></tr>` : ''}
            </table>
          </div>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #333; font-size: 14px;">🏪 ${businessName}</h3>
            ${businessPhone ? `<p style="margin: 5px 0; color: #666;">📞 ${businessPhone}</p>` : ''}
            ${businessEmail ? `<p style="margin: 5px 0; color: #666;">✉️ ${businessEmail}</p>` : ''}
          </div>

          ${status === 'review' && reviewLink ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${reviewLink}" style="display: inline-block; padding: 14px 32px; background: #f59e0b; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
              ⭐ Schrijf een recensie
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 12px;">Uw mening helpt ons en andere gasten.</p>
          </div>
          ` : ''}

          ${status !== 'cancelled' ? `
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Wilt u uw reservatie wijzigen of annuleren? Neem dan contact op via 
            ${businessPhone ? `<strong>${businessPhone}</strong>` : businessEmail ? `<strong>${businessEmail}</strong>` : 'de zaak'}.
          </p>
          ` : ''}
        </div>

        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #e5e5e5; border-top: none; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Dit is een automatische bevestiging van uw reservatie.
          </p>
          <p style="color: #999; font-size: 11px; margin: 10px 0 0;">
            Powered by <a href="https://www.vysionhoreca.com" style="color: #f97316; text-decoration: none;">Vysion Horeca</a>
          </p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"${businessName}" <${process.env.ZOHO_EMAIL}>`,
      to: customerEmail,
      replyTo: businessEmail || process.env.ZOHO_EMAIL,
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reservation email error:', error)
    return NextResponse.json({ error: 'Email versturen mislukt' }, { status: 500 })
  }
}
