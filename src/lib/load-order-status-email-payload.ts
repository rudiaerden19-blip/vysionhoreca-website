import { getServerSupabaseClient } from '@/lib/supabase-server'

export type OrderStatusEmailPayload = {
  customerEmail: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  orderNumber: string | number
  orderType?: string | null
  businessName: string
  businessEmail?: string | null
  businessPhone?: string | null
  businessAddress?: string | null
  businessPostalCode?: string | null
  businessCity?: string | null
  businessBtwNumber?: string | null
  items?: unknown
  subtotal?: number | null
  deliveryFee?: number | null
  discount?: number | null
  total?: number | null
  btwPercentage?: number | null
}

/** Laadt bon + zaakgegevens voor de klantmail (altijd tenant_slug). */
export async function loadOrderStatusEmailPayload(
  tenantSlug: string,
  orderId: string,
): Promise<OrderStatusEmailPayload | null> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return null

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, tenant_slug, order_number, customer_email, customer_name, customer_phone, customer_address, delivery_address, order_type, items, subtotal, delivery_fee, discount_amount, total',
    )
    .eq('id', orderId)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (error || !order) return null

  const email = String(order.customer_email || '').trim()
  if (!email) return null

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select(
      'business_name, email, phone, address, postal_code, city, btw_number, btw_percentage',
    )
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  return {
    customerEmail: email,
    customerName: String(order.customer_name || 'Klant'),
    customerPhone: order.customer_phone,
    customerAddress: order.customer_address || order.delivery_address,
    orderNumber: order.order_number,
    orderType: order.order_type,
    businessName: settings?.business_name || 'Restaurant',
    businessEmail: settings?.email,
    businessPhone: settings?.phone,
    businessAddress: settings?.address,
    businessPostalCode: settings?.postal_code,
    businessCity: settings?.city,
    businessBtwNumber: settings?.btw_number,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    discount: order.discount_amount,
    total: order.total,
    btwPercentage: settings?.btw_percentage || 6,
  }
}
