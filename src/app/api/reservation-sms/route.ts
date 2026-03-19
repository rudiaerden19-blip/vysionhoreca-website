import { NextRequest, NextResponse } from 'next/server'

// SMS via Twilio (vereist: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
// Als Twilio niet geconfigureerd → stille fallback

export async function POST(request: NextRequest) {
  try {
    const {
      to,
      guestName,
      reservationDate,
      reservationTime,
      partySize,
      businessName,
      businessPhone,
      type, // 'confirmation' | 'reminder' | 'cancellation' | 'checkin'
    } = await request.json()

    if (!to || !guestName) {
      return NextResponse.json({ error: 'Ontbrekende gegevens' }, { status: 400 })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromPhone = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromPhone) {
      return NextResponse.json({ success: false, reason: 'Twilio niet geconfigureerd' })
    }

    const formattedDate = new Date(reservationDate).toLocaleDateString('nl-BE', {
      weekday: 'long', day: 'numeric', month: 'long',
    })

    let message = ''
    switch (type) {
      case 'confirmation':
        message = `✅ Reservatie bevestigd bij ${businessName}\n📅 ${formattedDate} om ${reservationTime}\n👥 ${partySize} personen\n\nBedankt, ${guestName}! Tot dan.`
        break
      case 'reminder':
        message = `⏰ Herinnering: Morgen reservatie bij ${businessName}\n📅 ${formattedDate} om ${reservationTime}\n👥 ${partySize} personen\n\nKunt u niet komen? Bel ${businessPhone || 'ons'}.`
        break
      case 'cancellation':
        message = `❌ Reservatie geannuleerd bij ${businessName}\n📅 ${formattedDate} om ${reservationTime}\n\nVragen? Bel ${businessPhone || 'ons'}.`
        break
      case 'checkin':
        message = `✅ Ingecheckt bij ${businessName}. Welkom ${guestName}! Geniet van uw bezoek.`
        break
      default:
        message = `Reservatie update van ${businessName} voor ${guestName} - ${formattedDate} ${reservationTime}`
    }

    // Twilio API call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const body = new URLSearchParams({ To: to, From: fromPhone, Body: message })

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Twilio SMS error:', err)
      return NextResponse.json({ success: false, error: err }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SMS route error:', error)
    return NextResponse.json({ error: 'SMS versturen mislukt' }, { status: 500 })
  }
}
