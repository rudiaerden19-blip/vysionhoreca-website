import { supabase } from './supabase'
import { cache, CACHE_TTL, cacheKey } from './cache'

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
  btw_percentage?: number  // BTW percentage (6, 9, 12, 21)
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
  // Specialiteiten (3 items op homepage)
  specialty_1_image?: string
  specialty_1_title?: string
  specialty_2_image?: string
  specialty_2_title?: string
  specialty_3_image?: string
  specialty_3_title?: string
  // QR-codes sectie aan/uit
  show_qr_codes?: boolean
  // Personeel/vacature sectie
  hiring_enabled?: boolean
  hiring_title?: string
  hiring_description?: string
  hiring_contact?: string
  // Stripe & Cadeaubonnen
  stripe_secret_key?: string
  stripe_public_key?: string
  gift_cards_enabled?: boolean
  // Reserveringen aan/uit
  reservations_enabled?: boolean
}

export async function getTenantSettings(tenantSlug: string): Promise<TenantSettings | null> {
  return cache.getOrFetch(
    cacheKey('tenant_settings', tenantSlug),
    async () => {
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
    },
    CACHE_TTL.TENANT_SETTINGS
  )
}

export async function saveTenantSettings(settings: TenantSettings): Promise<boolean> {
  // Only include fields that definitely exist in the original database schema
  const safeSettings = {
    id: settings.id,
    tenant_slug: settings.tenant_slug,
    business_name: settings.business_name,
    tagline: settings.tagline,
    description: settings.description,
    logo_url: settings.logo_url,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    postal_code: settings.postal_code,
    city: settings.city,
    website: settings.website,
    facebook_url: settings.facebook_url,
    instagram_url: settings.instagram_url,
    tiktok_url: settings.tiktok_url,
    website_url: settings.website_url,
    about_image: settings.about_image,
    top_seller_1: settings.top_seller_1,
    top_seller_2: settings.top_seller_2,
    top_seller_3: settings.top_seller_3,
    cover_image_1: settings.cover_image_1,
    cover_image_2: settings.cover_image_2,
    cover_image_3: settings.cover_image_3,
    seo_title: settings.seo_title,
    seo_description: settings.seo_description,
    seo_keywords: settings.seo_keywords,
    seo_og_image: settings.seo_og_image,
  }

  // First try with all fields
  const { error } = await supabase
    .from('tenant_settings')
    .upsert(settings, { onConflict: 'tenant_slug' })
  
  if (error) {
    // If error, try with only safe/original fields
    console.warn('Trying save with safe columns only:', error.message)
    const { error: fallbackError } = await supabase
      .from('tenant_settings')
      .upsert(safeSettings, { onConflict: 'tenant_slug' })
    
    if (fallbackError) {
      console.error('Error saving tenant settings:', fallbackError)
      return false
    }
  }
  
  // Invalidate cache after successful save
  cache.invalidate(cacheKey('tenant_settings', settings.tenant_slug))
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
  return cache.getOrFetch(
    cacheKey('opening_hours', tenantSlug),
    async () => {
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
    },
    CACHE_TTL.OPENING_HOURS
  )
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

// Check if shop is currently open
export interface ShopStatus {
  isOpen: boolean
  message: string
  opensAt?: string
  closesAt?: string
  nextOpenDay?: string
}

export async function getShopStatus(tenantSlug: string): Promise<ShopStatus> {
  const hours = await getOpeningHours(tenantSlug)
  
  if (!hours || hours.length === 0) {
    // No opening hours set - assume open
    return { isOpen: true, message: 'Open' }
  }
  
  const now = new Date()
  // Convert to correct day format (0 = Monday in our system, JS uses 0 = Sunday)
  const jsDay = now.getDay()
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1 // Convert Sunday=0 to 6, Monday=1 to 0, etc.
  
  const currentTimeStr = now.toTimeString().slice(0, 5) // "HH:MM"
  
  const todayHours = hours.find(h => h.day_of_week === dayOfWeek)
  
  const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
  
  if (!todayHours || !todayHours.is_open) {
    // Closed today - find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextDayHours = hours.find(h => h.day_of_week === nextDay)
      if (nextDayHours && nextDayHours.is_open) {
        return {
          isOpen: false,
          message: `Gesloten - Weer open ${dayNames[nextDay]} om ${nextDayHours.open_time}`,
          nextOpenDay: dayNames[nextDay],
          opensAt: nextDayHours.open_time
        }
      }
    }
    return { isOpen: false, message: 'Momenteel gesloten' }
  }
  
  const openTime = todayHours.open_time
  const closeTime = todayHours.close_time
  
  // Check if we're before opening time
  if (currentTimeStr < openTime) {
    return {
      isOpen: false,
      message: `Gesloten - We openen vandaag om ${openTime}`,
      opensAt: openTime
    }
  }
  
  // Check if we're after closing time
  if (currentTimeStr >= closeTime) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextDayHours = hours.find(h => h.day_of_week === nextDay)
      if (nextDayHours && nextDayHours.is_open) {
        const dayLabel = i === 1 ? 'morgen' : dayNames[nextDay]
        return {
          isOpen: false,
          message: `Gesloten - Weer open ${dayLabel} om ${nextDayHours.open_time}`,
          nextOpenDay: dayLabel,
          opensAt: nextDayHours.open_time
        }
      }
    }
    return { isOpen: false, message: 'Momenteel gesloten' }
  }
  
  // Check break time
  if (todayHours.has_break && todayHours.break_start && todayHours.break_end) {
    if (currentTimeStr >= todayHours.break_start && currentTimeStr < todayHours.break_end) {
      return {
        isOpen: false,
        message: `Pauze - We zijn weer open om ${todayHours.break_end}`,
        opensAt: todayHours.break_end
      }
    }
  }
  
  // Shop is open!
  return {
    isOpen: true,
    message: `Open tot ${closeTime}`,
    closesAt: closeTime
  }
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
  return cache.getOrFetch(
    cacheKey('menu_categories', tenantSlug),
    async () => {
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
    },
    CACHE_TTL.MENU_CATEGORIES
  )
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
  is_promo?: boolean
  promo_price?: number
  sort_order: number
  allergens: string[]
}

export async function getMenuProducts(tenantSlug: string): Promise<MenuProduct[]> {
  return cache.getOrFetch(
    cacheKey('menu_products', tenantSlug),
    async () => {
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
    },
    CACHE_TTL.MENU_PRODUCTS
  )
}

export async function saveMenuProduct(product: MenuProduct): Promise<MenuProduct | null> {
  // Only include promo fields if they have values (to support databases without these columns yet)
  const { is_promo, promo_price, ...baseProduct } = product
  const productToSave = {
    ...baseProduct,
    ...(is_promo !== undefined && { is_promo }),
    ...(promo_price !== undefined && { promo_price }),
  }
  
  const { data, error } = await supabase
    .from('menu_products')
    .upsert(productToSave)
    .select()
    .single()
  
  if (error) {
    // If promo columns don't exist, retry without them
    if (error.code === 'PGRST204' || error.message?.includes('is_promo')) {
      console.warn('Promo columns not found, saving without them')
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('menu_products')
        .upsert(baseProduct)
        .select()
        .single()
      
      if (fallbackError) {
        console.error('Error saving menu product:', fallbackError)
        return null
      }
      return fallbackData
    }
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
  return cache.getOrFetch(
    cacheKey('delivery_settings', tenantSlug),
    async () => {
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
    },
    CACHE_TTL.DELIVERY_SETTINGS
  )
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

  if (!options || options.length === 0) return []

  // OPTIMIZED: Fetch ALL choices in ONE query instead of N queries
  const optionIds = options.map(o => o.id)
  const { data: allChoices } = await supabase
    .from('product_option_choices')
    .select('*')
    .in('option_id', optionIds)
    .eq('is_active', true)
    .order('sort_order')

  // Group choices by option_id
  const choicesByOptionId: Record<string, ProductOptionChoice[]> = {}
  ;(allChoices || []).forEach(choice => {
    if (!choicesByOptionId[choice.option_id]) {
      choicesByOptionId[choice.option_id] = []
    }
    choicesByOptionId[choice.option_id].push(choice)
  })

  // Combine options with their choices
  return options.map(option => ({
    ...option,
    choices: choicesByOptionId[option.id] || []
  }))
}

export async function saveProductOption(option: ProductOption): Promise<ProductOption | null> {
  const { choices, id, ...restData } = option
  
  // Only include id if it exists (for updates)
  const optionData = id ? { id, ...restData } : restData
  
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

    // Then insert new choices (without id to avoid conflicts)
    const choicesWithOptionId = choices.map((choice, index) => ({
      name: choice.name,
      price: choice.price || 0,
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

// Get all product IDs that have options linked
export async function getProductsWithOptions(tenantSlug: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_option_links')
    .select('product_id, product_options!inner(tenant_slug)')
    .eq('product_options.tenant_slug', tenantSlug)
  
  if (error || !data) {
    // Fallback: get all links and filter later
    const { data: allLinks } = await supabase
      .from('product_option_links')
      .select('product_id')
    
    return allLinks ? [...new Set(allLinks.map(l => l.product_id))] : []
  }
  
  return [...new Set(data.map(l => l.product_id))]
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
  
  if (optionsError || !options || options.length === 0) {
    return []
  }
  
  // OPTIMIZED: Fetch ALL choices in ONE query instead of N queries
  const { data: allChoices } = await supabase
    .from('product_option_choices')
    .select('*')
    .in('option_id', optionIds)
    .eq('is_active', true)
    .order('sort_order')

  // Group choices by option_id
  const choicesByOptionId: Record<string, ProductOptionChoice[]> = {}
  ;(allChoices || []).forEach(choice => {
    if (!choicesByOptionId[choice.option_id]) {
      choicesByOptionId[choice.option_id] = []
    }
    choicesByOptionId[choice.option_id].push(choice)
  })

  // Combine options with their choices
  return options.map(option => ({
    ...option,
    choices: choicesByOptionId[option.id] || []
  }))
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
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled' | 'rejected' | string
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
  confirmed_at?: string
  rejected_at?: string
  rejection_reason?: string
  rejection_notes?: string
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

export async function updateOrderStatus(
  id: string, 
  status: Order['status'], 
  rejectionReason?: string, 
  rejectionNotes?: string
): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase not configured')
    return false
  }
  
  const updateData: Record<string, unknown> = { status }
  
  // Add rejection fields if provided
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason
  }
  if (rejectionNotes) {
    updateData.rejection_notes = rejectionNotes
  }
  
  console.log('Updating order status:', id, status)
  
  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating order status:', JSON.stringify(error, null, 2))
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    return false
  }
  console.log('Order status updated successfully')
  return true
}

// Confirm order (goedkeuren)
export async function confirmOrder(id: string): Promise<boolean> {
  if (!supabase) return false
  
  const { error } = await supabase
    .from('orders')
    .update({ 
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', id)
  
  if (error) {
    console.error('Error confirming order:', error)
    return false
  }
  return true
}

// Reject order (weigeren)
export async function rejectOrder(
  id: string, 
  reason: string, 
  notes?: string
): Promise<boolean> {
  if (!supabase) return false
  
  const { error } = await supabase
    .from('orders')
    .update({ 
      status: 'rejected',
      rejection_reason: reason,
      rejection_notes: notes || null,
      rejected_at: new Date().toISOString()
    })
    .eq('id', id)
  
  if (error) {
    console.error('Error rejecting order:', error)
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

// =====================================================
// CUSTOMERS
// =====================================================
export interface Customer {
  id?: string
  tenant_slug: string
  email: string
  password_hash?: string
  name: string
  phone?: string
  address?: string
  postal_code?: string
  city?: string
  loyalty_points: number
  total_spent: number
  total_orders: number
  is_active: boolean
  email_verified: boolean
  created_at?: string
  updated_at?: string
  last_login?: string
}

// Simple hash for demo - in production use bcrypt
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'vysion_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registerCustomer(
  tenantSlug: string, 
  email: string, 
  password: string, 
  name: string, 
  phone: string,
  address: string,
  postal_code: string,
  city: string
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  // Check if email already exists
  const { data: existing } = await supabase
    .from('shop_customers')
    .select('id')
    .eq('tenant_slug', tenantSlug)
    .eq('email', email.toLowerCase())
    .single()
  
  if (existing) {
    return { success: false, error: 'Email is al in gebruik' }
  }
  
  const password_hash = await hashPassword(password)
  
  const { data, error } = await supabase
    .from('shop_customers')
    .insert({
      tenant_slug: tenantSlug,
      email: email.toLowerCase(),
      password_hash,
      name,
      phone,
      address,
      postal_code,
      city,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error registering customer:', error)
    return { success: false, error: 'Registratie mislukt' }
  }
  
  return { success: true, customer: data }
}

export async function loginCustomer(
  tenantSlug: string, 
  email: string, 
  password: string
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  const password_hash = await hashPassword(password)
  
  const { data, error } = await supabase
    .from('shop_customers')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('email', email.toLowerCase())
    .eq('password_hash', password_hash)
    .single()
  
  if (error || !data) {
    return { success: false, error: 'Onjuiste email of wachtwoord' }
  }
  
  // Update last login
  await supabase
    .from('shop_customers')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.id)
  
  return { success: true, customer: data }
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('shop_customers')
    .select('*')
    .eq('id', customerId)
    .single()
  
  if (error) return null
  return data
}

export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<boolean> {
  const { error } = await supabase
    .from('shop_customers')
    .update(updates)
    .eq('id', customerId)
  
  return !error
}

export async function getCustomerOrders(tenantSlug: string, customerEmail: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('customer_email', customerEmail)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) return []
  return data || []
}

export async function addLoyaltyPoints(customerId: string, points: number, orderTotal: number): Promise<boolean> {
  const { data: customer } = await supabase
    .from('shop_customers')
    .select('loyalty_points, total_spent, total_orders')
    .eq('id', customerId)
    .single()
  
  if (!customer) return false
  
  const { error } = await supabase
    .from('shop_customers')
    .update({
      loyalty_points: customer.loyalty_points + points,
      total_spent: customer.total_spent + orderTotal,
      total_orders: customer.total_orders + 1,
    })
    .eq('id', customerId)
  
  return !error
}

// =====================================================
// LOYALTY REWARDS
// =====================================================
export interface LoyaltyReward {
  id?: string
  tenant_slug: string
  name: string
  description?: string
  points_required: number
  reward_type: 'free_item' | 'discount_fixed' | 'discount_percentage'
  reward_value?: number
  is_active: boolean
  sort_order?: number
  created_at?: string
}

export async function getLoyaltyRewards(tenantSlug: string): Promise<LoyaltyReward[]> {
  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('points_required', { ascending: true })
  
  if (error) return []
  return data || []
}

export async function saveLoyaltyReward(reward: LoyaltyReward): Promise<boolean> {
  if (reward.id) {
    const { error } = await supabase
      .from('loyalty_rewards')
      .update(reward)
      .eq('id', reward.id)
    return !error
  } else {
    const { error } = await supabase
      .from('loyalty_rewards')
      .insert(reward)
    return !error
  }
}

export async function deleteLoyaltyReward(rewardId: string): Promise<boolean> {
  const { error } = await supabase
    .from('loyalty_rewards')
    .delete()
    .eq('id', rewardId)
  return !error
}

// GDPR: Verwijder klant account en alle data
export async function deleteCustomerAccount(customerId: string, tenantSlug: string): Promise<boolean> {
  if (!supabase) return false
  
  // 1. Verwijder loyalty redemptions
  await supabase
    .from('loyalty_redemptions')
    .delete()
    .eq('customer_id', customerId)
  
  // 2. Anonimiseer orders (verwijderen kan niet - financiële administratie)
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
    .eq('tenant_slug', tenantSlug)
    .eq('customer_email', (await supabase.from('shop_customers').select('email').eq('id', customerId).single()).data?.email)
  
  // 3. Verwijder klant account
  const { error } = await supabase
    .from('shop_customers')
    .delete()
    .eq('id', customerId)
  
  if (error) {
    console.error('Error deleting customer:', error)
    return false
  }
  
  return true
}

export async function redeemReward(customerId: string, rewardId: string, pointsUsed: number, tenantSlug: string): Promise<boolean> {
  // Deduct points from customer
  const { data: customer } = await supabase
    .from('shop_customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .single()
  
  if (!customer || customer.loyalty_points < pointsUsed) return false
  
  // Update customer points
  const { error: updateError } = await supabase
    .from('shop_customers')
    .update({ loyalty_points: customer.loyalty_points - pointsUsed })
    .eq('id', customerId)
  
  if (updateError) return false
  
  // Record redemption
  const { error: redemptionError } = await supabase
    .from('loyalty_redemptions')
    .insert({
      tenant_slug: tenantSlug,
      customer_id: customerId,
      reward_id: rewardId,
      points_used: pointsUsed,
    })
  
  return !redemptionError
}

// =====================================================
// BUSINESS ANALYSIS - DAILY SALES (Handmatige kassa omzet)
// =====================================================
export interface DailySales {
  id?: string
  tenant_slug: string
  date: string
  cash_revenue: number
  card_revenue: number
  total_revenue: number
  order_count: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export async function getDailySales(tenantSlug: string, year: number, month: number): Promise<DailySales[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  
  const { data, error } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  
  if (error) {
    console.error('Error fetching daily sales:', error)
    return []
  }
  return data || []
}

export async function saveDailySales(sales: DailySales): Promise<boolean> {
  const totalRevenue = (sales.cash_revenue || 0) + (sales.card_revenue || 0)
  
  const { error } = await supabase
    .from('daily_sales')
    .upsert({
      ...sales,
      total_revenue: totalRevenue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_slug,date' })
  
  if (error) {
    console.error('Error saving daily sales:', error)
    return false
  }
  return true
}

export async function deleteDailySales(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('daily_sales')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting daily sales:', error)
    return false
  }
  return true
}

// =====================================================
// BUSINESS ANALYSIS - FIXED COSTS (Vaste kosten)
// =====================================================
export type FixedCostCategory = 
  | 'RENT' 
  | 'PERSONNEL' 
  | 'ELECTRICITY' 
  | 'GAS' 
  | 'WATER' 
  | 'INSURANCE' 
  | 'LEASING' 
  | 'LOAN' 
  | 'SUBSCRIPTIONS' 
  | 'OTHER'

export const FIXED_COST_CATEGORIES: { id: FixedCostCategory; label: string; icon: string }[] = [
  { id: 'RENT', label: 'Huur', icon: '🏠' },
  { id: 'PERSONNEL', label: 'Personeel', icon: '👥' },
  { id: 'ELECTRICITY', label: 'Elektriciteit', icon: '⚡' },
  { id: 'GAS', label: 'Gas', icon: '🔥' },
  { id: 'WATER', label: 'Water', icon: '💧' },
  { id: 'INSURANCE', label: 'Verzekeringen', icon: '🛡️' },
  { id: 'LEASING', label: 'Leasing', icon: '📋' },
  { id: 'LOAN', label: 'Leningen', icon: '🏦' },
  { id: 'SUBSCRIPTIONS', label: 'Abonnementen', icon: '📱' },
  { id: 'OTHER', label: 'Overige', icon: '📦' },
]

export interface FixedCost {
  id?: string
  tenant_slug: string
  category: FixedCostCategory
  name: string
  amount: number
  notes?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export async function getFixedCosts(tenantSlug: string): Promise<FixedCost[]> {
  const { data, error } = await supabase
    .from('fixed_costs')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('category', { ascending: true })
  
  if (error) {
    console.error('Error fetching fixed costs:', error)
    return []
  }
  return data || []
}

export async function saveFixedCost(cost: FixedCost): Promise<FixedCost | null> {
  if (cost.id) {
    const { data, error } = await supabase
      .from('fixed_costs')
      .update({
        category: cost.category,
        name: cost.name,
        amount: cost.amount,
        notes: cost.notes,
        is_active: cost.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', cost.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating fixed cost:', error)
      return null
    }
    return data
  } else {
    const { data, error } = await supabase
      .from('fixed_costs')
      .insert({
        tenant_slug: cost.tenant_slug,
        category: cost.category,
        name: cost.name,
        amount: cost.amount,
        notes: cost.notes,
        is_active: cost.is_active ?? true,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating fixed cost:', error)
      return null
    }
    return data
  }
}

export async function deleteFixedCost(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('fixed_costs')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting fixed cost:', error)
    return false
  }
  return true
}

// =====================================================
// BUSINESS ANALYSIS - VARIABLE COSTS (Aankopen)
// =====================================================
export type VariableCostCategory = 
  | 'INGREDIENTS' 
  | 'PACKAGING' 
  | 'CLEANING' 
  | 'MAINTENANCE' 
  | 'MARKETING' 
  | 'OTHER'

export const VARIABLE_COST_CATEGORIES: { id: VariableCostCategory; label: string; icon: string }[] = [
  { id: 'INGREDIENTS', label: 'Ingrediënten', icon: '🥔' },
  { id: 'PACKAGING', label: 'Verpakking', icon: '📦' },
  { id: 'CLEANING', label: 'Schoonmaak', icon: '🧹' },
  { id: 'MAINTENANCE', label: 'Onderhoud', icon: '🔧' },
  { id: 'MARKETING', label: 'Marketing', icon: '📢' },
  { id: 'OTHER', label: 'Overige', icon: '📋' },
]

export interface VariableCost {
  id?: string
  tenant_slug: string
  category: VariableCostCategory
  description: string
  supplier?: string
  invoice_number?: string
  amount: number
  date: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export async function getVariableCosts(tenantSlug: string, year: number, month: number): Promise<VariableCost[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  
  const { data, error } = await supabase
    .from('variable_costs')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching variable costs:', error)
    return []
  }
  return data || []
}

export async function getAllVariableCosts(tenantSlug: string): Promise<VariableCost[]> {
  const { data, error } = await supabase
    .from('variable_costs')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching all variable costs:', error)
    return []
  }
  return data || []
}

export async function saveVariableCost(cost: VariableCost): Promise<VariableCost | null> {
  if (cost.id) {
    const { data, error } = await supabase
      .from('variable_costs')
      .update({
        category: cost.category,
        description: cost.description,
        supplier: cost.supplier,
        invoice_number: cost.invoice_number,
        amount: cost.amount,
        date: cost.date,
        notes: cost.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', cost.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating variable cost:', error)
      return null
    }
    return data
  } else {
    const { data, error } = await supabase
      .from('variable_costs')
      .insert({
        tenant_slug: cost.tenant_slug,
        category: cost.category,
        description: cost.description,
        supplier: cost.supplier,
        invoice_number: cost.invoice_number,
        amount: cost.amount,
        date: cost.date,
        notes: cost.notes,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating variable cost:', error)
      return null
    }
    return data
  }
}

export async function deleteVariableCost(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('variable_costs')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting variable cost:', error)
    return false
  }
  return true
}

// =====================================================
// BUSINESS ANALYSIS - BUSINESS TARGETS (Doelen)
// =====================================================
export interface BusinessTargets {
  id?: string
  tenant_slug: string
  target_profit_margin: number
  minimum_profit_margin: number
  max_personnel_percent: number
  max_ingredient_percent: number
  target_average_ticket: number
  created_at?: string
  updated_at?: string
}

export async function getBusinessTargets(tenantSlug: string): Promise<BusinessTargets> {
  const { data, error } = await supabase
    .from('business_targets')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .single()
  
  if (error || !data) {
    // Return defaults
    return {
      tenant_slug: tenantSlug,
      target_profit_margin: 25,
      minimum_profit_margin: 15,
      max_personnel_percent: 30,
      max_ingredient_percent: 35,
      target_average_ticket: 15,
    }
  }
  return data
}

export async function saveBusinessTargets(targets: BusinessTargets): Promise<boolean> {
  const { error } = await supabase
    .from('business_targets')
    .upsert({
      ...targets,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_slug' })
  
  if (error) {
    console.error('Error saving business targets:', error)
    return false
  }
  return true
}

// =====================================================
// BUSINESS ANALYSIS - MONTHLY REPORT CALCULATION
// =====================================================
export interface MonthlyReport {
  // Revenue
  onlineRevenue: number
  kassaRevenue: number
  totalRevenue: number
  
  // Orders
  onlineOrders: number
  kassaOrders: number
  totalOrders: number
  averageTicket: number
  
  // Costs
  totalFixedCosts: number
  totalVariableCosts: number
  totalCosts: number
  
  // Cost breakdown
  fixedCostBreakdown: { category: FixedCostCategory; amount: number }[]
  variableCostBreakdown: { category: VariableCostCategory; amount: number }[]
  
  // Profit
  grossProfit: number
  netProfit: number
  profitMargin: number
  
  // Health
  healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL'
  recommendations: string[]
}

export async function calculateMonthlyReport(
  tenantSlug: string, 
  year: number, 
  month: number
): Promise<MonthlyReport> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Last day of month
  
  // 1. Get online shop revenue from orders
  const { data: ordersData } = await supabase
    .from('orders')
    .select('total, status')
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)
    .not('status', 'in', '("cancelled","rejected")')
  
  const onlineRevenue = ordersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
  const onlineOrders = ordersData?.length || 0
  
  // 2. Get manual kassa revenue
  const dailySales = await getDailySales(tenantSlug, year, month)
  const kassaRevenue = dailySales.reduce((sum, d) => sum + (d.total_revenue || 0), 0)
  const kassaOrders = dailySales.reduce((sum, d) => sum + (d.order_count || 0), 0)
  
  // 3. Get fixed costs
  const fixedCosts = await getFixedCosts(tenantSlug)
  const activeFixedCosts = fixedCosts.filter(c => c.is_active)
  const totalFixedCosts = activeFixedCosts.reduce((sum, c) => sum + c.amount, 0)
  
  // Fixed cost breakdown by category
  const fixedCostBreakdown: { category: FixedCostCategory; amount: number }[] = []
  FIXED_COST_CATEGORIES.forEach(cat => {
    const amount = activeFixedCosts
      .filter(c => c.category === cat.id)
      .reduce((sum, c) => sum + c.amount, 0)
    if (amount > 0) {
      fixedCostBreakdown.push({ category: cat.id, amount })
    }
  })
  
  // 4. Get variable costs for this month
  const variableCosts = await getVariableCosts(tenantSlug, year, month)
  const totalVariableCosts = variableCosts.reduce((sum, c) => sum + c.amount, 0)
  
  // Variable cost breakdown by category
  const variableCostBreakdown: { category: VariableCostCategory; amount: number }[] = []
  VARIABLE_COST_CATEGORIES.forEach(cat => {
    const amount = variableCosts
      .filter(c => c.category === cat.id)
      .reduce((sum, c) => sum + c.amount, 0)
    if (amount > 0) {
      variableCostBreakdown.push({ category: cat.id, amount })
    }
  })
  
  // 5. Calculate totals
  const totalRevenue = onlineRevenue + kassaRevenue
  const totalOrders = onlineOrders + kassaOrders
  const totalCosts = totalFixedCosts + totalVariableCosts
  const grossProfit = totalRevenue - totalVariableCosts
  const netProfit = totalRevenue - totalCosts
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  // 6. Get business targets
  const targets = await getBusinessTargets(tenantSlug)
  
  // 7. Determine health status
  let healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL'
  if (profitMargin >= 35) {
    healthStatus = 'EXCELLENT'
  } else if (profitMargin >= 22) {
    healthStatus = 'GOOD'
  } else if (profitMargin >= 10) {
    healthStatus = 'WARNING'
  } else {
    healthStatus = 'CRITICAL'
  }
  
  // 8. Generate recommendations
  const recommendations: string[] = []
  
  if (totalRevenue === 0) {
    recommendations.push('📊 Geen omzet geregistreerd deze maand')
  } else {
    // Profit check
    if (profitMargin >= targets.target_profit_margin) {
      recommendations.push(`✅ UITSTEKEND! Financieel gezond met ${profitMargin.toFixed(1)}% marge`)
    } else if (profitMargin < targets.minimum_profit_margin) {
      recommendations.push(`🚨 KRITIEK: Winstmarge (${profitMargin.toFixed(1)}%) onder minimum (${targets.minimum_profit_margin}%)`)
    }
    
    // Personnel check
    const personnelCost = fixedCostBreakdown.find(c => c.category === 'PERSONNEL')?.amount || 0
    const personnelPercent = (personnelCost / totalRevenue) * 100
    if (personnelPercent > targets.max_personnel_percent) {
      recommendations.push(`👥 PERSONEEL TE DUUR: ${personnelPercent.toFixed(1)}% van omzet (max ${targets.max_personnel_percent}%)`)
      recommendations.push(`→ Bespaar €${(personnelCost - (totalRevenue * targets.max_personnel_percent / 100)).toFixed(2)} op personeel`)
    }
    
    // Ingredients check
    const ingredientsCost = variableCostBreakdown.find(c => c.category === 'INGREDIENTS')?.amount || 0
    const ingredientsPercent = (ingredientsCost / totalRevenue) * 100
    if (ingredientsPercent > targets.max_ingredient_percent) {
      recommendations.push(`🥔 INGREDIËNTEN TE DUUR: ${ingredientsPercent.toFixed(1)}% van omzet (max ${targets.max_ingredient_percent}%)`)
      recommendations.push(`→ Bespaar €${(ingredientsCost - (totalRevenue * targets.max_ingredient_percent / 100)).toFixed(2)} op ingrediënten`)
    }
    
    // Rent check (max 10%)
    const rentCost = fixedCostBreakdown.find(c => c.category === 'RENT')?.amount || 0
    const rentPercent = (rentCost / totalRevenue) * 100
    if (rentPercent > 10) {
      recommendations.push(`🏠 HUUR TE DUUR: ${rentPercent.toFixed(1)}% van omzet (max 10%)`)
    }
    
    // Energy check (max 8%)
    const energyCost = (fixedCostBreakdown.find(c => c.category === 'ELECTRICITY')?.amount || 0) +
                       (fixedCostBreakdown.find(c => c.category === 'GAS')?.amount || 0)
    const energyPercent = (energyCost / totalRevenue) * 100
    if (energyPercent > 8) {
      recommendations.push(`⚡ ENERGIE TE DUUR: ${energyPercent.toFixed(1)}% van omzet (max 8%)`)
    }
    
    // Average ticket check
    if (averageTicket < targets.target_average_ticket) {
      recommendations.push(`🧾 GEMIDDELDE BON TE LAAG: €${averageTicket.toFixed(2)} (doel: €${targets.target_average_ticket})`)
      recommendations.push(`→ Tip: Upselling, combo-deals, of prijzen verhogen`)
    }
    
    // Break-even check
    const breakEvenRevenue = totalVariableCosts > 0 
      ? totalFixedCosts / (1 - (totalVariableCosts / totalRevenue))
      : totalFixedCosts
    
    if (totalRevenue >= breakEvenRevenue) {
      recommendations.push(`📍 Break-even bereikt! €${(totalRevenue - breakEvenRevenue).toFixed(2)} boven break-even`)
    } else {
      recommendations.push(`📍 Nog €${(breakEvenRevenue - totalRevenue).toFixed(2)} nodig om break-even te bereiken`)
    }
  }
  
  return {
    onlineRevenue,
    kassaRevenue,
    totalRevenue,
    onlineOrders,
    kassaOrders,
    totalOrders,
    averageTicket,
    totalFixedCosts,
    totalVariableCosts,
    totalCosts,
    fixedCostBreakdown,
    variableCostBreakdown,
    grossProfit,
    netProfit,
    profitMargin,
    healthStatus,
    recommendations,
  }
}

// =====================================================
// STAFF / PERSONEEL
// =====================================================
export type StaffRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
export type ContractType = 'VAST' | 'INTERIM' | 'FLEXI' | 'STUDENT' | 'SEIZOEN' | 'FREELANCE' | 'STAGE'

export const CONTRACT_TYPES: { id: ContractType; label: string }[] = [
  { id: 'VAST', label: 'Vast contract' },
  { id: 'INTERIM', label: 'Interim' },
  { id: 'FLEXI', label: 'Flexi-job' },
  { id: 'STUDENT', label: 'Student' },
  { id: 'SEIZOEN', label: 'Seizoensarbeider' },
  { id: 'FREELANCE', label: 'Freelance' },
  { id: 'STAGE', label: 'Stagiair' },
]

export interface Staff {
  id?: string
  tenant_slug: string
  name: string
  email?: string
  phone?: string
  pin: string
  role: StaffRole
  color: string
  contract_type?: ContractType
  hours_per_week?: number
  hourly_rate?: number
  contract_start?: string
  contract_end?: string
  contract_notes?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export async function getStaff(tenantSlug: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching staff:', error)
    return []
  }
  return data || []
}

export async function getActiveStaff(tenantSlug: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching active staff:', error)
    return []
  }
  return data || []
}

export async function saveStaff(staff: Staff): Promise<Staff | null> {
  if (staff.id) {
    const { data, error } = await supabase
      .from('staff')
      .update({
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        pin: staff.pin,
        role: staff.role,
        color: staff.color,
        contract_type: staff.contract_type,
        hours_per_week: staff.hours_per_week,
        hourly_rate: staff.hourly_rate,
        contract_start: staff.contract_start,
        contract_end: staff.contract_end,
        contract_notes: staff.contract_notes,
        is_active: staff.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating staff:', error)
      return null
    }
    return data
  } else {
    const { data, error } = await supabase
      .from('staff')
      .insert({
        tenant_slug: staff.tenant_slug,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        pin: staff.pin,
        role: staff.role,
        color: staff.color,
        contract_type: staff.contract_type,
        hours_per_week: staff.hours_per_week,
        hourly_rate: staff.hourly_rate,
        contract_start: staff.contract_start,
        contract_end: staff.contract_end,
        contract_notes: staff.contract_notes,
        is_active: staff.is_active ?? true,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating staff:', error)
      return null
    }
    return data
  }
}

export async function deleteStaff(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting staff:', error)
    return false
  }
  return true
}

export async function verifyStaffPin(tenantSlug: string, pin: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('pin', pin)
    .eq('is_active', true)
    .single()
  
  if (error) return null
  return data
}

// =====================================================
// TIMESHEET ENTRIES / UREN REGISTRATIE
// =====================================================
export type AbsenceType = 
  | 'WORKED'      // Gewerkt
  | 'SICK'        // Ziekte
  | 'VACATION'    // Vakantie
  | 'SHORT_LEAVE' // Kort verzuim
  | 'AUTHORIZED'  // Geoorloofd afwezig
  | 'HOLIDAY'     // Feestdag
  | 'MATERNITY'   // Zwangerschapsverlof
  | 'PATERNITY'   // Vaderschapsverlof
  | 'UNPAID'      // Onbetaald verlof
  | 'TRAINING'    // Opleiding
  | 'OTHER'       // Overig

export const ABSENCE_TYPES: { id: AbsenceType; label: string; color: string; icon: string }[] = [
  { id: 'WORKED', label: 'Gewerkt', color: '#22c55e', icon: '✅' },
  { id: 'SICK', label: 'Ziekte', color: '#ef4444', icon: '🤒' },
  { id: 'VACATION', label: 'Vakantie', color: '#3b82f6', icon: '🏖️' },
  { id: 'SHORT_LEAVE', label: 'Kort verzuim', color: '#f97316', icon: '⏰' },
  { id: 'AUTHORIZED', label: 'Geoorloofd afwezig', color: '#8b5cf6', icon: '📋' },
  { id: 'HOLIDAY', label: 'Feestdag', color: '#06b6d4', icon: '🎉' },
  { id: 'MATERNITY', label: 'Zwangerschapsverlof', color: '#ec4899', icon: '👶' },
  { id: 'PATERNITY', label: 'Vaderschapsverlof', color: '#0ea5e9', icon: '👨‍👧' },
  { id: 'UNPAID', label: 'Onbetaald verlof', color: '#6b7280', icon: '💤' },
  { id: 'TRAINING', label: 'Opleiding', color: '#84cc16', icon: '📚' },
  { id: 'OTHER', label: 'Overig', color: '#a3a3a3', icon: '📝' },
]

export interface TimesheetEntry {
  id?: string
  tenant_slug: string
  staff_id: string
  date: string
  clock_in?: string
  clock_out?: string
  break_minutes: number
  worked_hours: number
  absence_type: AbsenceType
  absence_hours?: number
  notes?: string
  is_approved: boolean
  approved_by?: string
  approved_at?: string
  created_at?: string
  updated_at?: string
}

export async function getTimesheetEntries(
  tenantSlug: string, 
  staffId: string, 
  year: number, 
  month: number
): Promise<TimesheetEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  
  const { data, error } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('staff_id', staffId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  
  if (error) {
    console.error('Error fetching timesheet entries:', error)
    return []
  }
  return data || []
}

export async function getAllTimesheetEntries(
  tenantSlug: string, 
  year: number, 
  month: number
): Promise<TimesheetEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  
  const { data, error } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  
  if (error) {
    console.error('Error fetching all timesheet entries:', error)
    return []
  }
  return data || []
}

export async function saveTimesheetEntry(entry: TimesheetEntry): Promise<TimesheetEntry | null> {
  // Calculate worked hours if clock in/out provided
  let workedHours = entry.worked_hours || 0
  if (entry.clock_in && entry.clock_out && entry.absence_type === 'WORKED') {
    const [inH, inM] = entry.clock_in.split(':').map(Number)
    const [outH, outM] = entry.clock_out.split(':').map(Number)
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (entry.break_minutes || 0)
    workedHours = Math.max(0, totalMinutes / 60)
  }
  
  const entryData: Record<string, unknown> = {
    tenant_slug: entry.tenant_slug,
    staff_id: entry.staff_id,
    date: entry.date,
    clock_in: entry.clock_in || null,
    clock_out: entry.clock_out || null,
    break_minutes: entry.break_minutes || 0,
    worked_hours: workedHours,
    absence_type: entry.absence_type,
    absence_hours: entry.absence_type !== 'WORKED' ? entry.absence_hours : null,
    notes: entry.notes || null,
    is_approved: entry.is_approved || false,
    approved_by: entry.approved_by || null,
    approved_at: entry.is_approved ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }
  
  // Als we een ID hebben, update die specifieke entry
  if (entry.id) {
    const { data, error } = await supabase
      .from('timesheet_entries')
      .update(entryData)
      .eq('id', entry.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating timesheet entry:', error)
      return null
    }
    return data
  }
  
  // Anders insert nieuwe entry
  const { data, error } = await supabase
    .from('timesheet_entries')
    .insert(entryData)
    .select()
    .single()
  
  if (error) {
    console.error('Error saving timesheet entry:', error)
    return null
  }
  return data
}

export async function deleteTimesheetEntry(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('timesheet_entries')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting timesheet entry:', error)
    return false
  }
  return true
}

export async function approveTimesheetEntries(
  tenantSlug: string, 
  staffId: string, 
  year: number, 
  month: number,
  approvedById: string
): Promise<boolean> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  
  const { error } = await supabase
    .from('timesheet_entries')
    .update({ 
      is_approved: true, 
      approved_by: approvedById,
      approved_at: new Date().toISOString()
    })
    .eq('tenant_slug', tenantSlug)
    .eq('staff_id', staffId)
    .gte('date', startDate)
    .lte('date', endDate)
  
  if (error) {
    console.error('Error approving timesheet entries:', error)
    return false
  }
  return true
}

// =====================================================
// MONTHLY TIMESHEETS / MAANDOVERZICHTEN
// =====================================================
export interface MonthlyTimesheet {
  id?: string
  tenant_slug: string
  staff_id: string
  year: number
  month: number
  total_worked_hours: number
  total_sick_hours: number
  total_vacation_hours: number
  total_short_leave_hours: number
  total_authorized_hours: number
  total_holiday_hours: number
  total_maternity_hours: number
  total_paternity_hours: number
  total_unpaid_hours: number
  total_training_hours: number
  total_other_hours: number
  total_paid_hours: number
  contracted_hours: number
  overtime: number
  is_closed: boolean
  closed_at?: string
  closed_by?: string
  exported_at?: string
  created_at?: string
  updated_at?: string
}

export async function getMonthlyTimesheet(
  tenantSlug: string, 
  staffId: string, 
  year: number, 
  month: number
): Promise<MonthlyTimesheet | null> {
  const { data, error } = await supabase
    .from('monthly_timesheets')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('staff_id', staffId)
    .eq('year', year)
    .eq('month', month)
    .single()
  
  if (error) return null
  return data
}

export async function generateMonthlyTimesheet(
  tenantSlug: string, 
  staffId: string, 
  year: number, 
  month: number
): Promise<MonthlyTimesheet | null> {
  // Get all entries for this month
  const entries = await getTimesheetEntries(tenantSlug, staffId, year, month)
  
  // Get staff info for contracted hours
  const { data: staff } = await supabase
    .from('staff')
    .select('hours_per_week')
    .eq('id', staffId)
    .single()
  
  // Calculate hours by absence type
  const totals: Record<string, number> = {
    WORKED: 0,
    SICK: 0,
    VACATION: 0,
    SHORT_LEAVE: 0,
    AUTHORIZED: 0,
    HOLIDAY: 0,
    MATERNITY: 0,
    PATERNITY: 0,
    UNPAID: 0,
    TRAINING: 0,
    OTHER: 0,
  }
  
  entries.forEach(entry => {
    const hours = entry.absence_type === 'WORKED' 
      ? entry.worked_hours 
      : (entry.absence_hours || 0)
    totals[entry.absence_type] = (totals[entry.absence_type] || 0) + hours
  })
  
  // Calculate contracted hours for the month (hours_per_week * 4.33)
  const contractedHours = (staff?.hours_per_week || 0) * 4.33
  
  // Calculate total paid hours (everything except UNPAID)
  const totalPaidHours = Object.entries(totals)
    .filter(([type]) => type !== 'UNPAID')
    .reduce((sum, [, hours]) => sum + hours, 0)
  
  // Calculate overtime
  const overtime = Math.max(0, totals.WORKED - contractedHours)
  
  const timesheetData: MonthlyTimesheet = {
    tenant_slug: tenantSlug,
    staff_id: staffId,
    year,
    month,
    total_worked_hours: totals.WORKED,
    total_sick_hours: totals.SICK,
    total_vacation_hours: totals.VACATION,
    total_short_leave_hours: totals.SHORT_LEAVE,
    total_authorized_hours: totals.AUTHORIZED,
    total_holiday_hours: totals.HOLIDAY,
    total_maternity_hours: totals.MATERNITY,
    total_paternity_hours: totals.PATERNITY,
    total_unpaid_hours: totals.UNPAID,
    total_training_hours: totals.TRAINING,
    total_other_hours: totals.OTHER,
    total_paid_hours: totalPaidHours,
    contracted_hours: contractedHours,
    overtime,
    is_closed: false,
  }
  
  const { data, error } = await supabase
    .from('monthly_timesheets')
    .upsert(timesheetData, { onConflict: 'tenant_slug,staff_id,year,month' })
    .select()
    .single()
  
  if (error) {
    console.error('Error generating monthly timesheet:', error)
    return null
  }
  return data
}

export async function closeMonthlyTimesheet(
  tenantSlug: string, 
  staffId: string, 
  year: number, 
  month: number,
  closedById: string
): Promise<boolean> {
  // First regenerate to ensure up-to-date
  await generateMonthlyTimesheet(tenantSlug, staffId, year, month)
  
  const { error } = await supabase
    .from('monthly_timesheets')
    .update({ 
      is_closed: true, 
      closed_by: closedById,
      closed_at: new Date().toISOString()
    })
    .eq('tenant_slug', tenantSlug)
    .eq('staff_id', staffId)
    .eq('year', year)
    .eq('month', month)
  
  if (error) {
    console.error('Error closing monthly timesheet:', error)
    return false
  }
  return true
}

export async function markTimesheetExported(
  tenantSlug: string, 
  staffId: string, 
  year: number, 
  month: number
): Promise<boolean> {
  const { error } = await supabase
    .from('monthly_timesheets')
    .update({ exported_at: new Date().toISOString() })
    .eq('tenant_slug', tenantSlug)
    .eq('staff_id', staffId)
    .eq('year', year)
    .eq('month', month)
  
  if (error) {
    console.error('Error marking timesheet exported:', error)
    return false
  }
  return true
}

export async function reopenMonthlyTimesheet(
  tenantSlug: string, 
  staffId: string, 
  year: number, 
  month: number,
  reopenedById: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase
    .from('monthly_timesheets')
    .update({ 
      is_closed: false,
      reopened_at: new Date().toISOString(),
      reopened_by: reopenedById,
      reopen_reason: reason,
    })
    .eq('tenant_slug', tenantSlug)
    .eq('staff_id', staffId)
    .eq('year', year)
    .eq('month', month)
  
  if (error) {
    console.error('Error reopening monthly timesheet:', error)
    return false
  }
  return true
}

// =====================================================
// TEAM MEMBERS
// =====================================================
export interface TeamMember {
  id?: string
  tenant_slug: string
  name: string
  role?: string
  photo_url?: string
  display_order?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export async function getTeamMembers(tenantSlug: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }
  return data || []
}

export async function saveTeamMember(member: TeamMember): Promise<TeamMember | null> {
  if (member.id) {
    // Update
    const { data, error } = await supabase
      .from('team_members')
      .update({
        name: member.name,
        role: member.role,
        photo_url: member.photo_url,
        display_order: member.display_order,
        is_active: member.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating team member:', error)
      return null
    }
    return data
  } else {
    // Insert
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        tenant_slug: member.tenant_slug,
        name: member.name,
        role: member.role,
        photo_url: member.photo_url,
        display_order: member.display_order || 0,
        is_active: true,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating team member:', error)
      return null
    }
    return data
  }
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting team member:', error)
    return false
  }
  return true
}

// =====================================================
// GIFT CARDS / CADEAUBONNEN
// =====================================================
export interface GiftCard {
  id?: string
  tenant_slug: string
  code: string
  amount: number
  remaining_amount: number
  occasion?: string
  personal_message?: string
  sender_name?: string
  sender_email?: string
  recipient_name?: string
  recipient_email: string
  stripe_payment_id?: string
  status: 'pending' | 'paid' | 'used' | 'expired'
  is_sent?: boolean
  expires_at?: string
  used_at?: string
  created_at?: string
  updated_at?: string
}

export async function getGiftCards(tenantSlug: string): Promise<GiftCard[]> {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching gift cards:', error)
    return []
  }
  return data || []
}

export async function getGiftCardByCode(tenantSlug: string, code: string): Promise<GiftCard | null> {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('code', code)
    .single()
  
  if (error) {
    console.error('Error fetching gift card:', error)
    return null
  }
  return data
}

export async function createGiftCard(giftCard: Omit<GiftCard, 'id' | 'code'>): Promise<GiftCard | null> {
  // Generate unique code
  const code = generateGiftCardCode()
  
  const { data, error } = await supabase
    .from('gift_cards')
    .insert({
      ...giftCard,
      code,
      remaining_amount: giftCard.amount,
      status: 'pending',
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating gift card:', error)
    return null
  }
  return data
}

export async function updateGiftCardStatus(
  id: string, 
  status: GiftCard['status'], 
  stripePaymentId?: string
): Promise<boolean> {
  const updateData: Record<string, unknown> = { 
    status,
    updated_at: new Date().toISOString(),
  }
  
  if (stripePaymentId) {
    updateData.stripe_payment_id = stripePaymentId
  }
  
  if (status === 'paid') {
    updateData.is_sent = false // Will be set to true after email is sent
  }
  
  if (status === 'used') {
    updateData.used_at = new Date().toISOString()
    updateData.remaining_amount = 0
  }
  
  const { error } = await supabase
    .from('gift_cards')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating gift card status:', error)
    return false
  }
  return true
}

export async function markGiftCardSent(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('gift_cards')
    .update({ is_sent: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) {
    console.error('Error marking gift card as sent:', error)
    return false
  }
  return true
}

export async function useGiftCard(id: string, amountUsed: number): Promise<boolean> {
  // First get current remaining amount
  const { data: card, error: fetchError } = await supabase
    .from('gift_cards')
    .select('remaining_amount')
    .eq('id', id)
    .single()
  
  if (fetchError || !card) {
    console.error('Error fetching gift card:', fetchError)
    return false
  }
  
  const newRemaining = Math.max(0, card.remaining_amount - amountUsed)
  const newStatus = newRemaining === 0 ? 'used' : 'paid'
  
  const { error } = await supabase
    .from('gift_cards')
    .update({ 
      remaining_amount: newRemaining,
      status: newStatus,
      used_at: newRemaining === 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  
  if (error) {
    console.error('Error using gift card:', error)
    return false
  }
  return true
}

// Helper function to generate unique gift card code
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars like 0, O, 1, I
  let code = ''
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code // Format: XXXX-XXXX-XXXX
}
