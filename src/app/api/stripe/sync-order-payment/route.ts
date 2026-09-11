import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { syncTenantWebshopStripePayments } from '@/lib/webshop-stripe-sync-payment'

function parseTenantAndOrder(request: NextRequest, body: { tenant?: string; tenantSlug?: string; orderNumber?: unknown } | null) {
  const tenant = (
    body?.tenantSlug ||
    body?.tenant ||
    request.nextUrl.searchParams.get('tenant') ||
    ''
  ).trim()
  const rawOrder = body?.orderNumber ?? request.nextUrl.searchParams.get('orderNumber')
  const orderNumber =
    rawOrder != null && String(rawOrder).trim() !== '' ? Number(rawOrder) : undefined
  return {
    tenant,
    orderNumber: orderNumber != null && Number.isFinite(orderNumber) ? orderNumber : undefined,
  }
}

async function runSync(request: NextRequest, body: { tenant?: string; tenantSlug?: string; orderNumber?: unknown } | null) {
  const { tenant, orderNumber } = parseTenantAndOrder(request, body)
  if (!tenant) {
    return NextResponse.json({ error: 'tenant verplicht' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ updated: 0 })
  }

  const result = await syncTenantWebshopStripePayments(supabase, tenant, orderNumber)
  return NextResponse.json(result)
}

export async function GET(request: NextRequest) {
  return runSync(request, null)
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    tenant?: string
    tenantSlug?: string
    orderNumber?: unknown
  } | null
  return runSync(request, body)
}
