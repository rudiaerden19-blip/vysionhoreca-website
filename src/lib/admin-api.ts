import { supabase } from './supabase'

// =====================================================
// TENANT SETTINGS
// =====================================================
export interface TenantSettings {
  id?: string
  tenant_slug: string
  business_name: string
  tagline?: string  // Korte tekst voor header/footer
  description: string  // Lange tekst voor "Over Ons"
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
  top_seller_1?: string
  top_seller_2?: string
  top_seller_3?: string
  about_image?: string
  cover_image_1?: string
  cover_image_2?: string
  cover_image_3?: string
  // SEO fields
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  seo_og_image?: string
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

// =====================================================
// RESERVATIONS
// =====================================================
export interface Reservation {
  id?: string
  tenant_slug: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  reservation_date: string
  reservation_time: string
  party_size: number
  notes?: string
  status?: string
}

export async function createReservation(reservation: Reservation): Promise<boolean> {
  const { error } = await supabase
    .from('reservations')
    .insert(reservation)
  
  if (error) {
    console.error('Error creating reservation:', error)
    return false
  }
  return true
}

export async function getReservations(tenantSlug: string, date?: string): Promise<Reservation[]> {
  let query = supabase
    .from('reservations')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })
  
  if (date) {
    query = query.eq('reservation_date', date)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching reservations:', error)
    return []
  }
  return data || []
}

// =====================================================
// TENANT TEXTS
// =====================================================
export interface TenantTexts {
  hero_title?: string
  hero_subtitle?: string
  about_title?: string
  about_text?: string
  order_button_text?: string
  pickup_label?: string
  delivery_label?: string
  closed_message?: string
  min_order_message?: string
  cart_empty_message?: string
  checkout_button_text?: string
}

export async function getTenantTexts(tenantSlug: string): Promise<TenantTexts | null> {
  const { data, error } = await supabase
    .from('tenant_texts')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching tenant texts:', error)
    return null
  }
  return data
}

// =====================================================
// PRODUCT OPTIONS
// =====================================================
export interface ProductOptionChoice {
  id?: string
  option_id?: string
  tenant_slug: string
  name: string
  price: number
  sort_order: number
  is_active: boolean
}

export interface ProductOption {
  id?: string
  tenant_slug: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  sort_order: number
  is_active: boolean
  choices?: ProductOptionChoice[]
}

export async function getProductOptions(tenantSlug: string): Promise<ProductOption[]> {
  const { data: options, error } = await supabase
    .from('product_options')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
    .order('sort_order')
  
  if (error) {
    console.error('Error fetching product options:', error)
    return []
  }

  // Fetch choices for each option
  const optionsWithChoices: ProductOption[] = []
  for (const option of options || []) {
    const { data: choices } = await supabase
      .from('product_option_choices')
      .select('*')
      .eq('option_id', option.id)
      .eq('is_active', true)
      .order('sort_order')
    
    optionsWithChoices.push({
      ...option,
      choices: choices || []
    })
  }

  return optionsWithChoices
}

export async function saveProductOption(option: ProductOption): Promise<ProductOption | null> {
  const { choices, ...optionData } = option
  
  // Save or update the option
  const { data: savedOption, error } = await supabase
    .from('product_options')
    .upsert(optionData)
    .select()
    .single()
  
  if (error) {
    console.error('Error saving product option:', error)
    return null
  }

  // If we have choices, save them
  if (choices && choices.length > 0) {
    // First, delete existing choices for this option
    await supabase
      .from('product_option_choices')
      .delete()
      .eq('option_id', savedOption.id)

    // Then insert new choices
    const choicesWithOptionId = choices.map((choice, index) => ({
      ...choice,
      option_id: savedOption.id,
      tenant_slug: option.tenant_slug,
      sort_order: index,
      is_active: true,
    }))

    const { error: choicesError } = await supabase
      .from('product_option_choices')
      .insert(choicesWithOptionId)

    if (choicesError) {
      console.error('Error saving option choices:', choicesError)
    }
  }

  return { ...savedOption, choices }
}

export async function deleteProductOption(id: string): Promise<boolean> {
  // Choices will be deleted automatically due to CASCADE
  const { error } = await supabase
    .from('product_options')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting product option:', error)
    return false
  }
  return true
}

// =====================================================
// PRODUCT OPTION LINKS (Koppeling producten aan opties)
// =====================================================
export async function getProductOptionLinks(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_option_links')
    .select('option_id')
    .eq('product_id', productId)
  
  if (error) {
    console.error('Error fetching product option links:', error)
    return []
  }
  return data?.map(d => d.option_id) || []
}

export async function saveProductOptionLinks(productId: string, optionIds: string[], tenantSlug: string): Promise<boolean> {
  // First delete existing links
  await supabase
    .from('product_option_links')
    .delete()
    .eq('product_id', productId)
  
  // If no options selected, we're done
  if (optionIds.length === 0) return true
  
  // Insert new links
  const links = optionIds.map(optionId => ({
    product_id: productId,
    option_id: optionId,
    tenant_slug: tenantSlug
  }))
  
  const { error } = await supabase
    .from('product_option_links')
    .insert(links)
  
  if (error) {
    console.error('Error saving product option links:', error)
    return false
  }
  return true
}

export async function getOptionsForProduct(productId: string): Promise<ProductOption[]> {
  // Get linked option IDs
  const { data: links, error: linksError } = await supabase
    .from('product_option_links')
    .select('option_id')
    .eq('product_id', productId)
  
  if (linksError || !links || links.length === 0) {
    return []
  }
  
  const optionIds = links.map(l => l.option_id)
  
  // Get the options
  const { data: options, error: optionsError } = await supabase
    .from('product_options')
    .select('*')
    .in('id', optionIds)
    .eq('is_active', true)
    .order('sort_order')
  
  if (optionsError || !options) {
    return []
  }
  
  // Get choices for each option
  const optionsWithChoices: ProductOption[] = []
  for (const option of options) {
    const { data: choices } = await supabase
      .from('product_option_choices')
      .select('*')
      .eq('option_id', option.id)
      .eq('is_active', true)
      .order('sort_order')
    
    optionsWithChoices.push({
      ...option,
      choices: choices || []
    })
  }
  
  return optionsWithChoices
}

// =====================================================
// QR CODES
// =====================================================
export interface QrCode {
  id?: string
  tenant_slug: string
  name: string
  type: 'menu' | 'table' | 'promo' | 'review'
  target_url: string
  table_number?: number
  scans: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export async function getQrCodes(tenantSlug: string): Promise<QrCode[]> {
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching QR codes:', error)
    return []
  }
  return data || []
}

export async function saveQrCode(qrCode: QrCode): Promise<QrCode | null> {
  if (qrCode.id) {
    // Update existing
    const { data, error } = await supabase
      .from('qr_codes')
      .update({
        name: qrCode.name,
        type: qrCode.type,
        target_url: qrCode.target_url,
        table_number: qrCode.table_number,
        is_active: qrCode.is_active,
      })
      .eq('id', qrCode.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating QR code:', error)
      return null
    }
    return data
  } else {
    // Create new
    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        tenant_slug: qrCode.tenant_slug,
        name: qrCode.name,
        type: qrCode.type,
        target_url: qrCode.target_url,
        table_number: qrCode.table_number,
        scans: 0,
        is_active: true,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating QR code:', error)
      return null
    }
    return data
  }
}

export async function deleteQrCode(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('qr_codes')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting QR code:', error)
    return false
  }
  return true
}
