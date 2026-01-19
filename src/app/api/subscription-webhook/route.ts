import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Missing Stripe configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const stripe = new Stripe(stripeSecretKey)

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Handle invoice payment (one-time payment)
        if (session.mode === 'payment' && session.metadata?.type === 'invoice_payment') {
          const invoiceId = session.metadata?.invoice_id
          const tenantSlug = session.metadata?.tenant_slug

          if (invoiceId) {
            await supabase
              .from('invoices')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq('id', invoiceId)

            console.log(`Invoice ${invoiceId} paid for ${tenantSlug}`)
          }
        }
        
        // Handle subscription payment
        if (session.mode === 'subscription') {
          const tenantSlug = session.metadata?.tenant_slug
          const planId = session.metadata?.plan_id
          const stripeSubscriptionId = session.subscription as string

          if (tenantSlug) {
            // Get subscription details from Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
            const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)

            // Update subscription in database
            const { data: existingSub } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('tenant_slug', tenantSlug)
              .single()

            const subscriptionData = {
              tenant_slug: tenantSlug,
              plan: planId || 'starter',
              status: 'active',
              price_monthly: Math.round((stripeSubscription.items.data[0].price.unit_amount || 7900) / 100),
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: session.customer as string,
              subscription_started_at: new Date().toISOString(),
              next_payment_at: currentPeriodEnd.toISOString(),
            }

            if (existingSub) {
              await supabase
                .from('subscriptions')
                .update(subscriptionData)
                .eq('id', existingSub.id)
            } else {
              await supabase
                .from('subscriptions')
                .insert(subscriptionData)
            }

            // Also update tenants table
            await supabase
              .from('tenants')
              .update({
                plan: planId || 'starter',
                subscription_status: 'ACTIVE',
              })
              .eq('slug', tenantSlug)

            console.log(`Subscription activated for ${tenantSlug}`)
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubscriptionId = invoice.subscription as string

        if (stripeSubscriptionId) {
          // Find subscription by Stripe ID
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('stripe_subscription_id', stripeSubscriptionId)
            .single()

          if (sub) {
            // Get next payment date
            const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
            const nextPayment = new Date(stripeSubscription.current_period_end * 1000)

            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                next_payment_at: nextPayment.toISOString(),
              })
              .eq('id', sub.id)

            console.log(`Invoice paid for ${sub.tenant_slug}`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubscriptionId = invoice.subscription as string

        if (stripeSubscriptionId) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('stripe_subscription_id', stripeSubscriptionId)
            .single()

          if (sub) {
            // Mark as payment failed but don't immediately expire
            await supabase
              .from('subscriptions')
              .update({
                status: 'payment_failed',
              })
              .eq('id', sub.id)

            console.log(`Payment failed for ${sub.tenant_slug}`)
            
            // Send email notification about failed payment
            if (sub.tenant_slug) {
              try {
                const { data: settings } = await supabase
                  .from('tenant_settings')
                  .select('email, business_name')
                  .eq('tenant_slug', sub.tenant_slug)
                  .single()
                
                if (settings?.email) {
                  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://vysionhoreca.com'}/api/send-payment-reminder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: settings.email,
                      businessName: settings.business_name,
                      type: 'payment_failed',
                    }),
                  })
                }
              } catch (emailError) {
                console.error('Failed to send payment failed email:', emailError)
              }
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              subscription_ends_at: new Date().toISOString(),
            })
            .eq('id', sub.id)

          console.log(`Subscription cancelled for ${sub.tenant_slug}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (sub) {
          const status = subscription.status === 'active' ? 'active' 
            : subscription.status === 'past_due' ? 'payment_failed'
            : subscription.status === 'canceled' ? 'cancelled'
            : subscription.status === 'unpaid' ? 'expired'
            : sub.status

          await supabase
            .from('subscriptions')
            .update({
              status,
              next_payment_at: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', sub.id)

          console.log(`Subscription updated for ${sub.tenant_slug}: ${status}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error?.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
