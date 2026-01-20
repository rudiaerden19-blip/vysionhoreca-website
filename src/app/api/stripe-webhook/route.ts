import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import nodemailer from 'nodemailer'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Validate Supabase configuration
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      console.error('Stripe webhook failed: Supabase not configured')
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    // Verify required environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Initialize Stripe and verify webhook signature
    const stripe = new Stripe(stripeSecretKey)
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Webhook signature verification failed:', message)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 }
      )
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      
      const giftCardId = session.metadata?.gift_card_id
      const tenantSlug = session.metadata?.tenant_slug
      const recipientEmail = session.metadata?.recipient_email

      if (giftCardId && tenantSlug) {
        // Update gift card status to paid
        const { data: giftCard } = await supabase
          .from('gift_cards')
          .update({ 
            status: 'paid',
            stripe_payment_id: session.payment_intent as string,
          })
          .eq('id', giftCardId)
          .select()
          .single()

        if (giftCard) {
          // Get tenant info for email
          const { data: tenant } = await supabase
            .from('tenant_settings')
            .select('business_name, email, logo_url, primary_color')
            .eq('tenant_slug', tenantSlug)
            .single()

          // Send email to recipient
          if (tenant && recipientEmail) {
            await sendGiftCardEmail(giftCard, tenant, recipientEmail)
            
            // Mark as sent
            await supabase
              .from('gift_cards')
              .update({ is_sent: true })
              .eq('id', giftCardId)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function sendGiftCardEmail(
  giftCard: {
    code: string
    amount: number
    occasion?: string
    personal_message?: string
    sender_name?: string
    recipient_name?: string
  },
  tenant: {
    business_name: string
    email: string
    logo_url?: string
    primary_color: string
  },
  recipientEmail: string
) {
  // Create email transporter (using Zoho)
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_PASSWORD,
    },
  })

  const occasionText = giftCard.occasion ? `ter gelegenheid van ${giftCard.occasion}` : ''
  const senderText = giftCard.sender_name ? `van ${giftCard.sender_name}` : ''

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: ${tenant.primary_color}; padding: 30px; text-align: center;">
          ${tenant.logo_url ? `<img src="${tenant.logo_url}" alt="${tenant.business_name}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
          <h1 style="color: white; margin: 0; font-size: 24px;">🎁 Je hebt een cadeaubon ontvangen!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 18px; color: #333;">
            ${giftCard.recipient_name ? `Beste ${giftCard.recipient_name},` : 'Hallo!'}
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Je hebt een cadeaubon ontvangen ${senderText} ${occasionText} voor <strong>${tenant.business_name}</strong>!
          </p>
          
          ${giftCard.personal_message ? `
            <div style="background-color: #f9f9f9; border-left: 4px solid ${tenant.primary_color}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #666; margin: 0; font-style: italic;">"${giftCard.personal_message}"</p>
            </div>
          ` : ''}
          
          <!-- Gift Card -->
          <div style="background: linear-gradient(135deg, ${tenant.primary_color}, ${tenant.primary_color}dd); border-radius: 16px; padding: 30px; margin: 30px 0; color: white; text-align: center;">
            <p style="margin: 0 0 10px 0; opacity: 0.8; font-size: 14px;">CADEAUBON</p>
            <p style="margin: 0; font-size: 48px; font-weight: bold;">€${giftCard.amount.toFixed(2)}</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.3);">
              <p style="margin: 0 0 5px 0; opacity: 0.8; font-size: 12px;">JOUW CODE</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${giftCard.code}</p>
            </div>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Gebruik deze code bij het afrekenen op onze website of toon hem in de zaak om je cadeaubon in te wisselen.
          </p>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Deze cadeaubon is 1 jaar geldig.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            ${tenant.business_name}<br>
            <a href="mailto:${tenant.email}" style="color: ${tenant.primary_color};">${tenant.email}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: `"${tenant.business_name}" <${process.env.ZOHO_EMAIL}>`,
    to: recipientEmail,
    subject: `🎁 Je hebt een cadeaubon ontvangen van ${tenant.business_name}!`,
    html: htmlContent,
  })
}
