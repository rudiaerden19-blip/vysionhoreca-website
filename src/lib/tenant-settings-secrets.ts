/** Kolommen die nooit via de publieke Supabase-key leesbaar mogen zijn. */
export const TENANT_SETTINGS_SECRET_COLUMNS = [
  'stripe_secret_key',
  'stripe_webhook_secret',
  'sumup_api_key',
  'sumup_merchant_code',
  'mollie_api_key',
  'stripe_terminal_access_token',
  'sumup_oauth_refresh_token',
  'mollie_oauth_refresh_token',
  'smtp_password',
] as const

/**
 * Fallback als `select('*')` faalt omdat een geheime kolom geen SELECT meer heeft.
 * Alleen kolommen die de webshop en de kassa nodig hebben. Geen sleutels.
 */
export const TENANT_SETTINGS_PUBLIC_SELECT = [
  'id',
  'tenant_slug',
  'business_name',
  'tagline',
  'description',
  'logo_url',
  'primary_color',
  'secondary_color',
  'email',
  'accountant_email',
  'z_report_month_sent',
  'phone',
  'address',
  'postal_code',
  'city',
  'country',
  'btw_number',
  'kvk_number',
  'btw_percentage',
  'website',
  'facebook_url',
  'instagram_url',
  'tiktok_url',
  'website_url',
  'top_seller_1',
  'top_seller_2',
  'top_seller_3',
  'about_image',
  'cover_image_1',
  'cover_image_2',
  'cover_image_3',
  'admin_dashboard_background_image',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_og_image',
  'specialty_1_image',
  'specialty_1_title',
  'specialty_2_image',
  'specialty_2_title',
  'specialty_3_image',
  'specialty_3_title',
  'specialties_heading',
  'show_qr_codes',
  'hiring_enabled',
  'hiring_title',
  'hiring_description',
  'hiring_contact',
  'stripe_public_key',
  'gift_cards_enabled',
  'promotions_enabled',
  'reservations_enabled',
  'payment_methods',
  'image_display_mode',
  'dark_mode',
  'allergens_config',
  'kassa_staff_clock_enabled',
  'kassa_floor_plan_enabled',
  'kassa_footer_drawer_button',
  'kassa_checkout_vat_mode',
  'kassa_name_account_v2',
  'z_report_send_articles_to_accountant',
  'z_report_owner_evening_close',
  'kasboek_opening_balance',
  'kasboek_opening_balance_date',
  'report_register_opening_cash',
  'is_blocked',
  'created_at',
].join(',')

export function isTenantSettingsColumnPermissionError(message: string | undefined): boolean {
  return /42501|permission denied/i.test(message || '')
}

/** Haal betaal- en mail-sleutels uit een settings-object vóór het in de app blijft. */
export function stripTenantSettingsSecrets<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row }
  for (const key of TENANT_SETTINGS_SECRET_COLUMNS) {
    delete next[key]
  }
  return next
}
