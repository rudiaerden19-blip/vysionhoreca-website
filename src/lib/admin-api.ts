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
  postal_code?: string
  city?: string
  country?: string
  btw_number?: string  // BTW nummer voor kassabon
  kvk_number?: string  // KvK nummer
  website?: string
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

// =====================================================
// PROMOTIONS / DISCOUNT CODES
// =====================================================
export interface Promotion {
  id?: string
  tenant_slug: string
  name: string
  code: string
  type: 'percentage' | 'fixed' | 'freeItem'
  value: number
  free_item_id?: string
  min_order_amount: number
  max_discount?: number
  usage_count: number
  max_usage?: number
  max_usage_per_customer: number
  is_active: boolean
  starts_at?: string
  expires_at?: string
  created_at?: string
  updated_at?: string
}

export async function getPromotions(tenantSlug: string): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching promotions:', error)
    return []
  }
  return data || []
}

export async function savePromotion(promotion: Promotion): Promise<Promotion | null> {
  if (promotion.id) {
    // Update existing
    const { data, error } = await supabase
      .from('promotions')
      .update({
        name: promotion.name,
        code: promotion.code.toUpperCase(),
        type: promotion.type,
        value: promotion.value,
        free_item_id: promotion.free_item_id,
        min_order_amount: promotion.min_order_amount,
        max_discount: promotion.max_discount,
        max_usage: promotion.max_usage,
        max_usage_per_customer: promotion.max_usage_per_customer,
        is_active: promotion.is_active,
        starts_at: promotion.starts_at,
        expires_at: promotion.expires_at,
      })
      .eq('id', promotion.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating promotion:', error)
      return null
    }
    return data
  } else {
    // Create new
    const { data, error } = await supabase
      .from('promotions')
      .insert({
        tenant_slug: promotion.tenant_slug,
        name: promotion.name,
        code: promotion.code.toUpperCase(),
        type: promotion.type,
        value: promotion.value,
        free_item_id: promotion.free_item_id,
        min_order_amount: promotion.min_order_amount,
        max_discount: promotion.max_discount,
        usage_count: 0,
        max_usage: promotion.max_usage,
        max_usage_per_customer: promotion.max_usage_per_customer,
        is_active: true,
        starts_at: promotion.starts_at,
        expires_at: promotion.expires_at,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating promotion:', error)
      return null
    }
    return data
  }
}

export async function togglePromotionActive(id: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('promotions')
    .update({ is_active: isActive })
    .eq('id', id)
  
  if (error) {
    console.error('Error toggling promotion:', error)
    return false
  }
  return true
}

export async function deletePromotion(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting promotion:', error)
    return false
  }
  return true
}

// =====================================================
// REVIEWS
// =====================================================
export interface Review {
  id?: string
  tenant_slug: string
  order_id?: string
  customer_name: string
  customer_email?: string
  rating: number
  text?: string
  reply?: string
  replied_at?: string
  is_visible: boolean
  is_verified: boolean
  created_at?: string
  updated_at?: string
}

export async function getReviews(tenantSlug: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching reviews:', error)
    return []
  }
  return data || []
}

// Alleen goedgekeurde reviews voor de shop
export async function getVisibleReviews(tenantSlug: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(10) // Max 10 reviews tonen in shop
  
  if (error) {
    console.error('Error fetching visible reviews:', error)
    return []
  }
  return data || []
}

export async function saveReview(review: Review): Promise<Review | null> {
  if (review.id) {
    // Update existing
    const { data, error } = await supabase
      .from('reviews')
      .update({
        customer_name: review.customer_name,
        customer_email: review.customer_email,
        rating: review.rating,
        text: review.text,
        reply: review.reply,
        replied_at: review.reply ? new Date().toISOString() : null,
        is_visible: review.is_visible,
        is_verified: review.is_verified,
      })
      .eq('id', review.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating review:', error)
      return null
    }
    return data
  } else {
    // Create new - standaard NIET zichtbaar, eigenaar moet goedkeuren
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        tenant_slug: review.tenant_slug,
        order_id: review.order_id,
        customer_name: review.customer_name,
        customer_email: review.customer_email,
        rating: review.rating,
        text: review.text,
        is_visible: false, // Moet goedgekeurd worden door eigenaar
        is_verified: false,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating review:', error)
      return null
    }
    return data
  }
}

export async function replyToReview(id: string, reply: string): Promise<boolean> {
  const { error } = await supabase
    .from('reviews')
    .update({ 
      reply, 
      replied_at: new Date().toISOString() 
    })
    .eq('id', id)
  
  if (error) {
    console.error('Error replying to review:', error)
    return false
  }
  return true
}

export async function toggleReviewVisible(id: string, isVisible: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('reviews')
    .update({ is_visible: isVisible })
    .eq('id', id)
  
  if (error) {
    console.error('Error toggling review visibility:', error)
    return false
  }
  return true
}

export async function deleteReview(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting review:', error)
    return false
  }
  return true
}

// =====================================================
// ORDERS / BESTELLINGEN
// =====================================================
export interface OrderItem {
  id?: string
  order_id?: string
  tenant_slug: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  options_json?: Record<string, unknown>
  options_price: number
  total_price: number
  notes?: string
}

export interface Order {
  id?: string
  tenant_slug: string
  business_id?: string
  order_number?: number
  customer_name: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  customer_notes?: string
  order_type?: 'pickup' | 'delivery' | string
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled' | string
  delivery_address?: string
  delivery_notes?: string
  subtotal: number
  delivery_fee?: number
  discount_amount?: number
  discount_code?: string
  tax?: number
  total: number
  payment_method?: string
  payment_status?: string
  requested_date?: string
  requested_time?: string
  estimated_ready_time?: string
  completed_at?: string
  created_at?: string
  updated_at?: string
  // Items stored as JSONB in database
  items?: OrderItem[] | { name: string; quantity: number; price: number }[]
}

export async function getOrders(tenantSlug: string, status?: string): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
  
  if (status && status !== 'all') {
    if (status === 'active') {
      query = query.not('status', 'in', '("completed","cancelled")')
    } else {
      query = query.eq('status', status)
    }
  }
  
  const { data, error } = await query.limit(100)
  
  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }
  return data || []
}

export async function getOrderWithItems(orderId: string): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  
  if (error || !order) {
    console.error('Error fetching order:', error)
    return null
  }
  
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
  
  return { ...order, items: items || [] }
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<boolean> {
  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating order status:', error)
    return false
  }
  return true
}

// =====================================================
// SALES STATISTICS
// =====================================================
export interface SalesStats {
  total_orders: number
  total_revenue: number
  average_order: number
  orders_by_status: Record<string, number>
}

export async function getSalesStats(tenantSlug: string, period: 'today' | 'week' | 'month' | 'year'): Promise<SalesStats> {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
  }
  
  const { data, error } = await supabase
    .from('orders')
    .select('total, status')
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', startDate.toISOString())
    .not('status', 'eq', 'cancelled')
  
  if (error || !data) {
    console.error('Error fetching sales stats:', error)
    return { total_orders: 0, total_revenue: 0, average_order: 0, orders_by_status: {} }
  }
  
  const total_orders = data.length
  const total_revenue = data.reduce((sum, o) => sum + (o.total || 0), 0)
  const average_order = total_orders > 0 ? total_revenue / total_orders : 0
  
  const orders_by_status: Record<string, number> = {}
  data.forEach(o => {
    orders_by_status[o.status] = (orders_by_status[o.status] || 0) + 1
  })
  
  return { total_orders, total_revenue, average_order, orders_by_status }
}

export async function getDailyRevenue(tenantSlug: string, days: number = 7): Promise<{ date: string; revenue: number; orders: number }[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', startDate.toISOString())
    .not('status', 'eq', 'cancelled')
  
  if (error || !data) {
    console.error('Error fetching daily revenue:', error)
    return []
  }
  
  // Group by date
  const dailyData: Record<string, { revenue: number; orders: number }> = {}
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    dailyData[dateKey] = { revenue: 0, orders: 0 }
  }
  
  data.forEach(order => {
    const dateKey = order.created_at.split('T')[0]
    if (dailyData[dateKey]) {
      dailyData[dateKey].revenue += order.total || 0
      dailyData[dateKey].orders += 1
    }
  })
  
  return Object.entries(dailyData)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTopProducts(tenantSlug: string, period: 'week' | 'month' | 'year' = 'month'): Promise<{ name: string; sales: number; revenue: number }[]> {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
  }
  
  const { data, error } = await supabase
    .from('order_items')
    .select('product_name, quantity, total_price')
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', startDate.toISOString())
  
  if (error || !data) {
    console.error('Error fetching top products:', error)
    return []
  }
  
  // Aggregate by product name
  const productStats: Record<string, { sales: number; revenue: number }> = {}
  
  data.forEach(item => {
    if (!productStats[item.product_name]) {
      productStats[item.product_name] = { sales: 0, revenue: 0 }
    }
    productStats[item.product_name].sales += item.quantity
    productStats[item.product_name].revenue += item.total_price
  })
  
  return Object.entries(productStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
}
