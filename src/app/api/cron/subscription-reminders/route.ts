import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import nodemailer from 'nodemailer'

// Vercel Cron Job - runs daily at 9:00 AM
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" }] }

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow without secret in development, require in production
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('Subscription reminder cron unauthorized')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    console.log('Starting subscription reminder cron job...')

    // Calculate date 3 days from now
    const today = new Date()
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    // Format dates for comparison
    const threeDaysFromNowStart = new Date(threeDaysFromNow)
    threeDaysFromNowStart.setHours(0, 0, 0, 0)
    
    const threeDaysFromNowEnd = new Date(threeDaysFromNow)
    threeDaysFromNowEnd.setHours(23, 59, 59, 999)

    console.log(`Looking for subscriptions expiring on: ${threeDaysFromNow.toISOString().split('T')[0]}`)

    // Find subscriptions that expire in exactly 3 days
    const { data: expiringSubscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('next_payment_at', threeDaysFromNowStart.toISOString())
      .lte('next_payment_at', threeDaysFromNowEnd.toISOString())

    if (error) {
      console.error('Error fetching expiring subscriptions:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      console.log('No subscriptions expiring in 3 days')
      return NextResponse.json({ 
        success: true, 
        message: 'No subscriptions expiring soon',
        checked: 0,
        sent: 0
      })
    }

    console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in 3 days`)

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER || 'info@vysionhoreca.com',
        pass: process.env.ZOHO_PASS,
      },
    })

    let sent = 0
    let failed = 0

    for (const subscription of expiringSubscriptions) {
      try {
        // Haal tenant settings op voor email adres
        const { data: tenantSettings } = await supabase
          .from('tenant_settings')
          .select('email, business_name')
          .eq('tenant_slug', subscription.tenant_slug)
          .single()

        const email = tenantSettings?.email
        const businessName = tenantSettings?.business_name || subscription.tenant_slug

        if (!email) {
          console.log(`No email for ${subscription.tenant_slug}, skipping`)
          continue
        }

        // Create payment link
        const paymentLink = `https://www.vysionhoreca.com/shop/${subscription.tenant_slug}/admin/abonnement`
        const expiryDate = new Date(subscription.next_payment_at).toLocaleDateString('nl-BE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #FF6B35, #f59e0b); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .info-box { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .info-box h2 { color: #c2410c; margin: 0 0 10px 0; font-size: 18px; }
    .cta-button { display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 20px 0; }
    .cta-button:hover { background: #16a34a; }
    .footer { background: #1a1a2e; color: #888; padding: 30px; text-align: center; font-size: 14px; }
    .deadline { font-size: 20px; font-weight: bold; color: #c2410c; text-align: center; margin: 20px 0; padding: 15px; background: #fff7ed; border-radius: 8px; }
    .benefits { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .benefits li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Abonnement Herinnering</h1>
    </div>
    
    <div class="content">
      <p>Beste ${businessName},</p>
      
      <div class="info-box">
        <h2>⏰ Uw abonnement loopt bijna af</h2>
        <p style="margin: 0;">Uw Vysion Horeca abonnement verloopt binnenkort. Verleng op tijd om uw webshop online te houden!</p>
      </div>
      
      <p class="deadline">📆 Vervaldatum: ${expiryDate}</p>
      
      <p>Verleng nu uw abonnement om te blijven genieten van:</p>
      
      <div class="benefits">
        <ul>
          <li>✅ Uw online bestelwebsite blijft actief</li>
          <li>✅ Klanten kunnen blijven bestellen</li>
          <li>✅ Toegang tot het admin panel</li>
          <li>✅ Automatische bestellingen en betalingen</li>
          <li>✅ Klantenservice en ondersteuning</li>
        </ul>
      </div>
      
      <p style="text-align: center;">
        <a href="${paymentLink}" class="cta-button">💳 Nu Verlengen</a>
      </p>
      
      <p>Na verlenging blijft alles gewoon werken zonder onderbreking.</p>
      
      <p>Heeft u vragen? Stuur een email naar <a href="mailto:info@vysionhoreca.com">info@vysionhoreca.com</a></p>
      
      <p>Met vriendelijke groet,<br><strong>Team Vysion Horeca</strong></p>
    </div>
    
    <div class="footer">
      <p>Vysion Horeca - Bestelplatform voor de horeca</p>
      <p>www.vysionhoreca.com | info@vysionhoreca.com</p>
    </div>
  </div>
</body>
</html>
`

        await transporter.sendMail({
          from: '"Vysion Horeca" <info@vysionhoreca.com>',
          to: email,
          subject: `📅 Uw abonnement loopt bijna af - Verleng voor ${expiryDate}`,
          html: emailHtml,
        })

        console.log(`✅ Reminder sent to ${email} for ${subscription.tenant_slug}`)
        sent++

      } catch (emailError) {
        console.error(`❌ Failed to send reminder to ${subscription.tenant_slug}:`, emailError)
        failed++
      }
    }

    console.log(`Subscription reminder cron completed: ${sent} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      checked: expiringSubscriptions.length,
      sent,
      failed
    })

  } catch (error) {
    console.error('Subscription reminder cron error:', error)
    return NextResponse.json({ 
      error: 'Cron job failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
