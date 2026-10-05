import bcrypt from 'bcryptjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyPassword, needsHashUpgrade, type Customer } from '@/lib/admin-api'
import { resolveWebshopTenantSlug, webshopTenantSlugDbVariants } from '@/lib/webshop-tenant-slug'

const PUBLIC_CUSTOMER_COLUMNS =
  'id,tenant_slug,email,name,phone,address,postal_code,city,loyalty_points,total_spent,total_orders,is_active,email_verified,created_at,updated_at,last_login,first_name,last_name'

export type PublicShopCustomer = Omit<Customer, 'password_hash'>

function stripCustomer(row: Record<string, unknown>): PublicShopCustomer {
  const { password_hash: _ph, ...rest } = row
  return rest as PublicShopCustomer
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function registerShopCustomerServer(
  supabase: SupabaseClient,
  tenantSlug: string,
  input: {
    email: string
    password: string
    name: string
    phone: string
    address: string
    postal_code: string
    city: string
  },
): Promise<{ ok: true; customer: PublicShopCustomer } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase()
  if (!email || !input.password || !input.name.trim()) {
    return { ok: false, error: 'bad_request' }
  }

  const canonicalSlug = await resolveWebshopTenantSlug(supabase, tenantSlug)
  const slugVariants = [...new Set([canonicalSlug, ...webshopTenantSlugDbVariants(tenantSlug)])]

  const { data: existing } = await supabase
    .from('shop_customers')
    .select('id')
    .in('tenant_slug', slugVariants)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { ok: false, error: 'email_in_use' }
  }

  const password_hash = await hashPassword(input.password)

  const { data, error } = await supabase
    .from('shop_customers')
    .insert({
      tenant_slug: canonicalSlug,
      email,
      password_hash,
      name: input.name.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      postal_code: input.postal_code.trim(),
      city: input.city.trim(),
      loyalty_points: 0,
      total_spent: 0,
      total_orders: 0,
      is_active: true,
      email_verified: false,
    })
    .select(PUBLIC_CUSTOMER_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[shop-customer-auth] register', error)
    return { ok: false, error: 'registration_failed' }
  }

  return { ok: true, customer: stripCustomer(data as Record<string, unknown>) }
}

export async function loginShopCustomerServer(
  supabase: SupabaseClient,
  tenantSlug: string,
  emailRaw: string,
  password: string,
): Promise<{ ok: true; customer: PublicShopCustomer } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase()
  const canonicalSlug = await resolveWebshopTenantSlug(supabase, tenantSlug)
  const slugVariants = [...new Set([canonicalSlug, ...webshopTenantSlugDbVariants(tenantSlug)])]

  const { data, error } = await supabase
    .from('shop_customers')
    .select('*')
    .in('tenant_slug', slugVariants)
    .eq('email', email)
    .maybeSingle()

  if (error || !data?.password_hash) {
    return { ok: false, error: 'invalid_credentials' }
  }

  const isValid = await verifyPassword(password, data.password_hash as string)
  if (!isValid) {
    return { ok: false, error: 'invalid_credentials' }
  }

  if (needsHashUpgrade(data.password_hash as string)) {
    const newHash = await hashPassword(password)
    await supabase.from('shop_customers').update({ password_hash: newHash }).eq('id', data.id)
  }

  await supabase
    .from('shop_customers')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.id)

  return { ok: true, customer: stripCustomer(data as Record<string, unknown>) }
}

export async function getShopCustomerByIdServer(
  supabase: SupabaseClient,
  tenantSlug: string,
  customerId: string,
): Promise<PublicShopCustomer | null> {
  const canonicalSlug = await resolveWebshopTenantSlug(supabase, tenantSlug)
  const slugVariants = [...new Set([canonicalSlug, ...webshopTenantSlugDbVariants(tenantSlug)])]

  const { data, error } = await supabase
    .from('shop_customers')
    .select(PUBLIC_CUSTOMER_COLUMNS)
    .in('tenant_slug', slugVariants)
    .eq('id', customerId)
    .maybeSingle()

  if (error || !data) return null
  return stripCustomer(data as Record<string, unknown>)
}

/** GDPR: account + redemptions verwijderen; orders anonimiseren (tenant-scoped). */
export async function deleteShopCustomerAccountServer(
  supabase: SupabaseClient,
  tenantSlug: string,
  customerId: string,
): Promise<boolean> {
  const customer = await getShopCustomerByIdServer(supabase, tenantSlug, customerId)
  if (!customer?.id) return false

  const dbTenant =
    customer.tenant_slug || (await resolveWebshopTenantSlug(supabase, tenantSlug))
  const email = customer.email?.trim().toLowerCase()

  await supabase
    .from('loyalty_redemptions')
    .delete()
    .eq('tenant_slug', dbTenant)
    .eq('customer_id', customerId)

  if (email) {
    await supabase
      .from('orders')
      .update({
        customer_name: 'Verwijderd',
        customer_phone: null,
        customer_email: null,
        customer_address: null,
        delivery_address: null,
        delivery_notes: null,
        customer_notes: null,
      })
      .eq('tenant_slug', dbTenant)
      .eq('customer_email', email)
  }

  const { error } = await supabase
    .from('shop_customers')
    .delete()
    .eq('tenant_slug', dbTenant)
    .eq('id', customerId)

  if (error) {
    console.error('[shop-customer-auth] delete account', error)
    return false
  }
  return true
}
