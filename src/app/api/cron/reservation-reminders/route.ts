import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import nodemailer from 'nodemailer'

// Vercel Cron Job - runs daily at 10:00 AM
// Stuurt herinnering naar gasten met reservatie morgen

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })

    // Bereken morgen
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Haal alle reservaties op voor morgen met email
    const { data: reservations } = await supabase
      .from('reservations')
      .select('*, tenants:tenant_slug(name, phone, email)')
      .eq('reservation_date', tomorrowStr)
      .in('status', ['CONFIRMED', 'PENDING'])
      .not('guest_email', 'is', null)

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: { user: process.env.ZOHO_EMAIL, pass: process.env.ZOHO_PASSWORD },
    })

    let sent = 0
    for (const r of reservations) {
      try {
        const tenant = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants
        const businessName = tenant?.name || 'Het restaurant'
        const businessPhone = tenant?.phone || ''
        const formattedDate = new Date(r.reservation_date).toLocaleDateString('nl-BE', {
          weekday: 'long', day: 'numeric', month: 'long',
        })

        await transporter.sendMail({
          from: `"${businessName}" <${process.env.ZOHO_EMAIL}>`,
          to: r.guest_email,
          subject: `⏰ Herinnering: Uw reservatie morgen bij ${businessName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; padding: 30px; background: #f59e0b; border-radius: 16px 16px 0 0;">
                <span style="font-size: 64px;">⏰</span>
                <h1 style="color: white; margin: 20px 0 10px; font-size: 28px;">Herinnering Reservatie</h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">${businessName}</p>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Beste ${r.guest_name},</p>
                <p style="font-size: 15px; color: #555;">Dit is een herinnering voor uw reservatie <strong>morgen</strong>.</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px; color: #166534; font-size: 16px;">📋 Uw reservatie</h3>
                  <table style="width: 100%;">
                    <tr><td style="padding: 6px 0; color: #555; width: 40%;"><strong>📅 Datum</strong></td><td style="color: #333;">${formattedDate}</td></tr>
                    <tr><td style="padding: 6px 0; color: #555;"><strong>🕐 Tijd</strong></td><td style="color: #333;">${r.reservation_time}</td></tr>
                    <tr><td style="padding: 6px 0; color: #555;"><strong>👥 Personen</strong></td><td style="color: #333;">${r.party_size} ${r.party_size === 1 ? 'persoon' : 'personen'}</td></tr>
                    ${r.table_number ? `<tr><td style="padding: 6px 0; color: #555;"><strong>🪑 Tafel</strong></td><td style="color: #333;">${r.table_number}</td></tr>` : ''}
                  </table>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Kunt u niet komen? Annuleer dan tijdig via ${businessPhone ? `<strong>${businessPhone}</strong>` : 'de zaak'}.
                </p>
              </div>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #e5e5e5; border-top: none; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">Powered by <a href="https://vysionhoreca.com" style="color: #f97316; text-decoration: none;">Vysion Horeca</a></p>
              </div>
            </div>
          `,
        })
        sent++
      } catch (err) {
        console.error(`Reminder email failed for ${r.guest_email}:`, err)
      }
    }

    console.log(`Reservation reminders: ${sent}/${reservations.length} sent`)
    return NextResponse.json({ success: true, sent, total: reservations.length })
  } catch (error) {
    console.error('Reservation reminders cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
