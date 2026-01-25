import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

// Vercel Cron Job - runs daily at midnight
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/archive-z-reports", "schedule": "0 0 * * *" }] }

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow without secret in development, require in production
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('Cron job unauthorized: invalid secret')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    console.log('Starting Z-report archival cron job...')

    // Get yesterday's date (we archive the previous day)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    console.log(`Archiving Z-reports for: ${yesterdayStr}`)

    // Get all tenants that have orders from yesterday
    const startOfDay = `${yesterdayStr}T00:00:00`
    const endOfDay = `${yesterdayStr}T23:59:59`

    const { data: ordersWithTenants } = await supabase
      .from('orders')
      .select('tenant_slug')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .eq('status', 'completed')

    if (!ordersWithTenants || ordersWithTenants.length === 0) {
      console.log('No completed orders found for yesterday')
      return NextResponse.json({ 
        success: true, 
        message: 'No orders to archive',
        date: yesterdayStr 
      })
    }

    // Get unique tenant slugs
    const tenantSlugs = Array.from(new Set(ordersWithTenants.map(o => o.tenant_slug)))
    console.log(`Found ${tenantSlugs.length} tenants with orders`)

    let archived = 0
    let failed = 0

    for (const tenantSlug of tenantSlugs) {
      try {
        // Get all completed orders for this tenant on this date
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total, payment_method')
          .eq('tenant_slug', tenantSlug)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .eq('status', 'completed')

        if (!orders || orders.length === 0) continue

        // Get tenant settings
        const { data: settings } = await supabase
          .from('tenant_settings')
          .select('btw_percentage, business_name, address, btw_number')
          .eq('tenant_slug', tenantSlug)
          .single()

        const btwPercentage = settings?.btw_percentage || 6

        // Calculate totals
        let total = 0
        let cashPayments = 0
        let onlinePayments = 0
        let cardPayments = 0
        const orderIds: string[] = []

        orders.forEach(order => {
          orderIds.push(order.id)
          const orderTotal = order.total || 0
          total += orderTotal

          const paymentMethod = (order.payment_method || '').toLowerCase()
          if (paymentMethod === 'cash' || paymentMethod === 'contant') {
            cashPayments += orderTotal
          } else if (paymentMethod === 'card' || paymentMethod === 'pin' || paymentMethod === 'kaart') {
            cardPayments += orderTotal
          } else {
            onlinePayments += orderTotal
          }
        })

        const taxRate = btwPercentage / 100
        const subtotal = total / (1 + taxRate)
        const tax = total - subtotal

        // Generate simple hash
        const hashInput = JSON.stringify({
          tenant: tenantSlug,
          date: yesterdayStr,
          orderCount: orders.length,
          total: Math.round(total * 100),
          orderIds: orderIds.sort(),
          version: 'v1'
        })
        let hash = 0
        for (let i = 0; i < hashInput.length; i++) {
          const char = hashInput.charCodeAt(i)
          hash = ((hash << 5) - hash) + char
          hash = hash & hash
        }
        const reportHash = Math.abs(hash).toString(16).padStart(16, '0')

        // Check if report already exists
        const { data: existingReport } = await supabase
          .from('z_reports')
          .select('id')
          .eq('tenant_slug', tenantSlug)
          .eq('report_date', yesterdayStr)
          .single()

        if (existingReport) {
          // Update existing
          await supabase
            .from('z_reports')
            .update({
              order_count: orders.length,
              subtotal,
              tax_low: btwPercentage === 6 ? tax : 0,
              tax_mid: btwPercentage === 12 ? tax : 0,
              tax_high: btwPercentage === 21 ? tax : 0,
              total,
              cash_payments: cashPayments,
              card_payments: cardPayments,
              online_payments: onlinePayments,
              btw_percentage: btwPercentage,
              business_name: settings?.business_name,
              business_address: settings?.address,
              btw_number: settings?.btw_number,
              order_ids: orderIds,
              report_hash: reportHash,
              generated_at: new Date().toISOString(),
              is_archived: true,
              archived_at: new Date().toISOString(),
            })
            .eq('id', existingReport.id)
        } else {
          // Insert new
          await supabase
            .from('z_reports')
            .insert({
              tenant_slug: tenantSlug,
              report_date: yesterdayStr,
              order_count: orders.length,
              subtotal,
              tax_low: btwPercentage === 6 ? tax : 0,
              tax_mid: btwPercentage === 12 ? tax : 0,
              tax_high: btwPercentage === 21 ? tax : 0,
              total,
              cash_payments: cashPayments,
              card_payments: cardPayments,
              online_payments: onlinePayments,
              btw_percentage: btwPercentage,
              business_name: settings?.business_name,
              business_address: settings?.address,
              btw_number: settings?.btw_number,
              order_ids: orderIds,
              report_hash: reportHash,
              generated_at: new Date().toISOString(),
              is_archived: true,
              archived_at: new Date().toISOString(),
            })
        }

        console.log(`✅ Archived Z-report for ${tenantSlug}: ${orders.length} orders, €${total.toFixed(2)}`)
        archived++
      } catch (error) {
        console.error(`❌ Failed to archive Z-report for ${tenantSlug}:`, error)
        failed++
      }
    }

    console.log(`Cron job completed: ${archived} archived, ${failed} failed`)

    return NextResponse.json({
      success: true,
      date: yesterdayStr,
      tenantsProcessed: tenantSlugs.length,
      archived,
      failed
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ 
      error: 'Cron job failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
