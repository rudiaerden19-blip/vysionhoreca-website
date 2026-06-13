import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { VYSION_INFO_EMAIL, resolveZohoUser } from '@/lib/vysion-contact'

import { logger } from '@/lib/logger'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'

/**
 * Stuurt een betalingsherinnering naar een tenant.
 *
 * Toegangsregels:
 *   - Superadmin (handmatig vanuit het superadmin-dashboard) — `verifySuperAdminAccess`.
 *   - Subscription-webhook (server-to-server) — header `x-cron-secret`moet matchen
 *     `process.env.CRON_SECRET`(zelfde secret als overige cron-routes).
 *
 * Anonymous calls worden geweigerd: anders kan iedereen op het internet uit jouw
 * Zoho-mailbox spam pushen onder de Vysion-naam.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  // ── Auth: superadmin OR cron-secret ────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = request.headers.get('x-cron-secret')
  const cronOk = !!cronSecret && headerSecret === cronSecret

  let authorized = cronOk
  if (!authorized) {
    const sa = await verifySuperAdminAccess(request)
    authorized = sa.authorized
  }

  if (!authorized) {
    logger.warn('send-payment-reminder: unauthorized', { requestId })
    return NextResponse.json({ error: 'Niet geautoriseerd'}, { status: 403 })
  }

  try {
    const body = await request.json()
    const { tenantEmail, tenantName, tenantSlug } = body

    if (!tenantEmail || !tenantName) {
      return NextResponse.json({ error: 'Email en naam zijn verplicht'}, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: resolveZohoUser(),
        pass: process.env.ZOHO_PASS,
      },
    })

    const paymentLink = `https://www.vysion-kassa.com/betalen/${tenantSlug}`

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
    .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .warning-box h2 { color: #dc2626; margin: 0 0 10px 0; font-size: 18px; }
    .cta-button { display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 20px 0; }
    .cta-button:hover { background: #16a34a; }
    .footer { background: #1a1a2e; color: #888; padding: 30px; text-align: center; font-size: 14px; }
    .deadline { font-size: 24px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1> Betalingsherinnering</h1>
    </div>
    
    <div class="content">
      <p>Beste ${tenantName},</p>
      
      <div class="warning-box">
        <h2> Uw abonnement is niet betaald</h2>
        <p style="margin: 0;">We hebben nog geen betaling ontvangen voor uw Vysion kassa's abonnement.</p>
      </div>
      
      <p class="deadline"> Nog 3 dagen om te betalen</p>
      
      <p>Als we binnen <strong>3 dagen</strong> geen betaling ontvangen, wordt uw software automatisch gedeactiveerd. Dit betekent:</p>
      
      <ul>
        <li> Uw webshop wordt offline gehaald</li>
        <li> Klanten kunnen niet meer bestellen</li>
        <li> U verliest toegang tot het admin panel</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="${paymentLink}" class="cta-button"> Nu Betalen</a>
      </p>
      
      <p>Heeft u al betaald? Neem dan contact met ons op zodat we uw account kunnen activeren.</p>
      
      <p>Heeft u vragen over uw factuur? Stuur een email naar <a href="mailto:${VYSION_INFO_EMAIL}">${VYSION_INFO_EMAIL}</a></p>
      
      <p>Met vriendelijke groet,<br><strong>Team Vysion kassa's</strong></p>
    </div>
    
    <div class="footer">
      <p>Vysion kassa's - Bestelplatform voor zaken</p>
      <p>www.vysion-kassa.com | ${VYSION_INFO_EMAIL}</p>
    </div>
  </div>
</body>
</html>
`

    await transporter.sendMail({
      from: `"Vysion kassa's" <${VYSION_INFO_EMAIL}>`,
      to: tenantEmail,
      subject: `Betalingsherinnering - Uw abonnement wordt binnen 3 dagen gedeactiveerd`,
      html: emailHtml,
    })

    return NextResponse.json({ success: true, message: 'Betalingsherinnering verzonden'})
  } catch (error) {
    logger.error('send-payment-reminder error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Fout bij verzenden email'}, { status: 500 })
  }
}
