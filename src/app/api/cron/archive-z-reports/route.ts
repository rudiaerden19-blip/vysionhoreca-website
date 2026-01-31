import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { getDateBoundsForBelgium, getBelgiumDateString } from '@/lib/admin-api'

// Vercel Cron Job - runs daily at midnight
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/archive-z-reports", "schedule": "0 0 * * *" }] }

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow without secret in development, require in production
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Cron job unauthorized: invalid secret', { requestId })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      logger.error('Database not configured', { requestId })
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    logger.info('Starting Z-report archival cron job', { requestId })

    // Get yesterday's date IN BELGIUM TIMEZONE (we archive the previous day)
    // KRITIEK: Gebruik Belgium timezone, niet UTC!
    const now = new Date()
    const todayBelgium = getBelgiumDateString(now)
    // Get yesterday in Belgium timezone
    const yesterdayDate = new Date(now)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = getBelgiumDateString(yesterdayDate)

    logger.info('Archiving Z-reports', { requestId, date: yesterdayStr, todayBelgium })

    // KRITIEK: Gebruik Belgium timezone voor correcte dag grenzen
    const { startUTC, endUTC } = getDateBoundsForBelgium(yesterdayStr)
    logger.info('Query bounds', { requestId, startUTC, endUTC })

    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, tenant_slug, total, payment_method')
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .eq('status', 'completed')

    if (ordersError) {
      logger.error('Failed to fetch orders', { requestId, error: ordersError.message })
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    if (!allOrders || allOrders.length === 0) {
      logger.info('No completed orders found for yesterday', { requestId, date: yesterdayStr })
      return NextResponse.json({ 
        success: true, 
        message: 'No orders to archive',
        date: yesterdayStr 
      })
    }

    // Get unique tenant slugs
    const tenantSlugs = Array.from(new Set(allOrders.map(o => o.tenant_slug)))
    logger.info('Found tenants with orders', { requestId, tenantCount: tenantSlugs.length })

    // Batch fetch all tenant settings in ONE query
    const { data: allSettings } = await supabase
      .from('tenant_settings')
      .select('tenant_slug, btw_percentage, business_name, address, btw_number')
      .in('tenant_slug', tenantSlugs)

    // Create settings lookup map
    const settingsMap = new Map(
      (allSettings || []).map(s => [s.tenant_slug, s])
    )

    // Batch fetch existing z_reports in ONE query
    const { data: existingReports } = await supabase
      .from('z_reports')
      .select('id, tenant_slug')
      .eq('report_date', yesterdayStr)
      .in('tenant_slug', tenantSlugs)

    // Create existing reports lookup map
    const existingReportsMap = new Map(
      (existingReports || []).map(r => [r.tenant_slug, r.id])
    )

    // Group orders by tenant (in memory - much faster than individual queries)
    const ordersByTenant = new Map<string, typeof allOrders>()
    for (const order of allOrders) {
      const existing = ordersByTenant.get(order.tenant_slug) || []
      existing.push(order)
      ordersByTenant.set(order.tenant_slug, existing)
    }

    // Process each tenant and prepare batch operations
    const reportsToInsert: Array<Record<string, unknown>> = []
    const reportsToUpdate: Array<{ id: string; data: Record<string, unknown> }> = []
    
    let archived = 0
    let failed = 0

    for (const tenantSlug of tenantSlugs) {
      try {
        const orders = ordersByTenant.get(tenantSlug)
        if (!orders || orders.length === 0) continue

        const settings = settingsMap.get(tenantSlug)
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

        const reportData = {
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
        }

        const existingId = existingReportsMap.get(tenantSlug)
        if (existingId) {
          reportsToUpdate.push({ id: existingId, data: reportData })
        } else {
          reportsToInsert.push({
            tenant_slug: tenantSlug,
            report_date: yesterdayStr,
            ...reportData
          })
        }

        logger.debug('Prepared Z-report', { 
          requestId, 
          tenantSlug, 
          orderCount: orders.length, 
          total: total.toFixed(2) 
        })
        archived++
      } catch (error) {
        logger.error('Failed to process tenant Z-report', { 
          requestId, 
          tenantSlug, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        failed++
      }
    }

    // Batch insert new reports
    if (reportsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('z_reports')
        .insert(reportsToInsert)

      if (insertError) {
        logger.error('Failed to batch insert Z-reports', { 
          requestId, 
          error: insertError.message,
          count: reportsToInsert.length 
        })
        failed += reportsToInsert.length
        archived -= reportsToInsert.length
      } else {
        logger.info('Batch inserted Z-reports', { requestId, count: reportsToInsert.length })
      }
    }

    // Update existing reports (Supabase doesn't support batch update, so we do individual updates)
    // But at least we've reduced the read queries significantly
    for (const { id, data } of reportsToUpdate) {
      const { error: updateError } = await supabase
        .from('z_reports')
        .update(data)
        .eq('id', id)

      if (updateError) {
        logger.error('Failed to update Z-report', { requestId, id, error: updateError.message })
        failed++
        archived--
      }
    }

    const duration = Date.now() - startTime
    logger.info('Cron job completed', { 
      requestId, 
      date: yesterdayStr,
      tenantsProcessed: tenantSlugs.length,
      archived, 
      failed,
      duration 
    })

    return NextResponse.json({
      success: true,
      date: yesterdayStr,
      tenantsProcessed: tenantSlugs.length,
      archived,
      failed,
      duration
    })

  } catch (error) {
    logger.error('Cron job error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime 
    })
    return NextResponse.json({ 
      error: 'Cron job failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
