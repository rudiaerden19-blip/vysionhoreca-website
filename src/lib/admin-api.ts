import { supabase } from './supabase'

// =====================================================
// TENANT SETTINGS
// =====================================================
export interface TenantSettings {
  id?: string
  tenant_slug: string
  business_name: string
  description: string
  logo_url: string
  primary_color: string
  secondary_color: string
  email: string
  phone: string
  address: string
  facebook_url: string
  instagram_url: string
  tiktok_url: string
  website_url: string
}

export async function getTenantSettings(tenantSlug: string): Promise<TenantSettings | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .single()
  
  if (error) {
    console.error('Error fetching tenant settings:', error)
    return null
  }
  return data
}

export async function saveTenantSettings(settings: TenantSettings): Promise<boolean> {
  const { error } = await supabase
    .from('tenant_settings')
    .upsert(settings, { onConflict: 'tenant_slug' })
  
  if (error) {
    console.error('Error saving tenant settings:', error)
    return false
  }
  return true
}

// =====================================================
// OPENING HOURS
// =====================================================
export interface OpeningHour {
  id?: string
  tenant_slug: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  has_break: boolean
  break_start: string | null
  break_end: string | null
}

export async function getOpeningHours(tenantSlug: string): Promise<OpeningHour[]> {
  const { data, error } = await supabase
    .from('opening_hours')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('day_of_week')
  
  if (error) {
    console.error('Error fetching opening hours:', error)
    return []
  }
  return data || []
}

export async function saveOpeningHours(hours: OpeningHour[]): Promise<boolean> {
  const { error } = await supabase
    .from('opening_hours')
    .upsert(hours, { onConflict: 'tenant_slug,day_of_week' })
  
  if (error) {
    console.error('Error saving opening hours:', error)
    return false
  }
  return true
}

// =====================================================
// MENU CATEGORIES
// =====================================================
export interface MenuCategory {
  id?: string
  tenant_slug: string
  name: string
  description: string
  sort_order: number
  is_active: boolean
}

export async function getMenuCategories(tenantSlug: string): Promise<MenuCategory[]> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('sort_order')
  
  if (error) {
    console.error('Error fetching menu categories:', error)
    return []
  }
  return data || []
}

export async function saveMenuCategory(category: MenuCategory): Promise<MenuCategory | null> {
  const { data, error } = await supabase
    .from('menu_categories')
    .upsert(category)
    .select()
    .single()
  
  if (error) {
    console.error('Error saving menu category:', error)
    return null
  }
  return data
}

export async function deleteMenuCategory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting menu category:', error)
    return false
  }
  return true
}

// =====================================================
// MENU PRODUCTS
// =====================================================
export interface MenuProduct {
  id?: string
  tenant_slug: string
  category_id: string | null
  name: string
  description: string
  price: number
  image_url: string
  is_active: boolean
  is_popular: boolean
  sort_order: number
  allergens: string[]
}

export async function getMenuProducts(tenantSlug: string): Promise<MenuProduct[]> {
  const { data, error } = await supabase
    .from('menu_products')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('sort_order')
  
  if (error) {
    console.error('Error fetching menu products:', error)
    return []
  }
  return data || []
}

export async function saveMenuProduct(product: MenuProduct): Promise<MenuProduct | null> {
  const { data, error } = await supabase
    .from('menu_products')
    .upsert(product)
    .select()
    .single()
  
  if (error) {
    console.error('Error saving menu product:', error)
    return null
  }
  return data
}

export async function deleteMenuProduct(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('menu_products')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting menu product:', error)
    return false
  }
  return true
}

// =====================================================
// DELIVERY SETTINGS
// =====================================================
export interface DeliverySettings {
  id?: string
  tenant_slug: string
  pickup_enabled: boolean
  pickup_time_minutes: number
  delivery_enabled: boolean
  delivery_fee: number
  min_order_amount: number
  delivery_radius_km: number
  delivery_time_minutes: number
  payment_cash: boolean
  payment_card: boolean
  payment_online: boolean
}

export async function getDeliverySettings(tenantSlug: string): Promise<DeliverySettings | null> {
  const { data, error } = await supabase
    .from('delivery_settings')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .single()
  
  if (error) {
    console.error('Error fetching delivery settings:', error)
    return null
  }
  return data
}

export async function saveDeliverySettings(settings: DeliverySettings): Promise<boolean> {
  const { error } = await supabase
    .from('delivery_settings')
    .upsert(settings, { onConflict: 'tenant_slug' })
  
  if (error) {
    console.error('Error saving delivery settings:', error)
    return false
  }
  return true
}
