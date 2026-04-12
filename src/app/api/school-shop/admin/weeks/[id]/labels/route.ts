import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ItemRow = { name?: string; quantity?: number }

/** Orders voor schoolweek (betaald) + regels voor etiketten. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
    if (!tenant_slug) {
      return NextResponse.json({ error: 'tenant_slug verplicht' }, { status: 400 })
    }
    const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { data: week } = await supabase
      .from('school_shop_weeks')
      .select('id, title, access_code, order_deadline')
      .eq('id', params.id)
      .eq('tenant_slug', tenant_slug)
      .maybeSingle()

    if (!week) {
      return NextResponse.json({ error: 'Week niet gevonden' }, { status: 404 })
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_notes, items, total, payment_status, created_at')
      .eq('tenant_slug', tenant_slug)
      .eq('school_shop_week_id', params.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    const paid = (orders || []).filter(
      (o) => (o.payment_status || '').toString().toLowerCase() === 'paid'
    )

    const labels: { customerName: string; productName: string; quantity: number; orderNumber: number | null }[] = []
    for (const o of paid) {
      const items = (o.items || []) as ItemRow[]
      const name = (o.customer_name || '—').toString()
      for (const it of items) {
        const q = Math.max(1, Number(it.quantity) || 1)
        const pname = (it.name || 'Product').toString()
        for (let i = 0; i < q; i++) {
          labels.push({
            customerName: name,
            productName: pname,
            quantity: 1,
            orderNumber: o.order_number ?? null,
          })
        }
      }
    }

    return NextResponse.json({ week, orders: paid, labels })
  } catch (e) {
    console.error('school-shop labels GET', e)
    return NextResponse.json({ error: 'Mislukt' }, { status: 500 })
  }
}
