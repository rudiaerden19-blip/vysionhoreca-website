/**
 * Cron: herbereken z_reports voor alle tenants (batch) zodat bonnen = archief = dag = maand.
 * Schedule: elk uur, 12 batches → volledige tenant-set per dag.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron-auth'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import {
  defaultReconcileYearMonths,
  reconcileTenantBatch,
} from '@/lib/z-report-reconcile'

const BATCH_COUNT = 12

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  const cronDenied = requireCronSecret(request, {
    requestId,
    route: '/api/cron/reconcile-z-reports',
  })
  if (cronDenied) return cronDenied

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const hour = new Date().getUTCHours()
  const batchIndex = hour % BATCH_COUNT
  const yearMonths = defaultReconcileYearMonths()

  try {
    const result = await reconcileTenantBatch(
      supabase,
      yearMonths,
      batchIndex,
      BATCH_COUNT,
    )

    logger.info('reconcile-z-reports batch done', {
      requestId,
      batchIndex,
      tenantsProcessed: result.tenantsProcessed,
      totalDatesRegenerated: result.totalDatesRegenerated,
      remainingIssues: result.remainingIssues,
      duration: Date.now() - startTime,
    })

    return NextResponse.json({
      success: true,
      ...result,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    logger.error('reconcile-z-reports failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 })
  }
}
