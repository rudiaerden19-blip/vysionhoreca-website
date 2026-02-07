import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

// Debug endpoint to check WhatsApp settings
export async function GET(request: NextRequest) {
  try {
    // Get all whatsapp_settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('tenant_slug, phone_number_id, is_active, whatsapp_number, access_token')
    
    if (settingsError) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: settingsError.message 
      }, { status: 500 })
    }

    // Check if test phone number ID exists
    const testPhoneId = '1027031347150330'
    const tenant = settings?.find(s => s.phone_number_id === testPhoneId)

    // Test the WhatsApp API connection if we have settings
    let apiTest = null
    if (tenant?.access_token) {
      try {
        const response = await fetch(`${WHATSAPP_API_URL}/${tenant.phone_number_id}`, {
          headers: {
            'Authorization': `Bearer ${tenant.access_token}`
          }
        })
        const data = await response.json()
        apiTest = {
          status: response.status,
          ok: response.ok,
          response: data
        }
      } catch (err) {
        apiTest = { error: String(err) }
      }
    }

    return NextResponse.json({
      status: 'ok',
      message: 'WhatsApp Debug Info',
      verify_token_set: !!process.env.WHATSAPP_VERIFY_TOKEN,
      verify_token_length: process.env.WHATSAPP_VERIFY_TOKEN?.length || 0,
      test_phone_number_id: testPhoneId,
      test_number_configured: !!tenant,
      total_settings: settings?.length || 0,
      settings: settings?.map(s => ({
        tenant: s.tenant_slug,
        phone_number_id: s.phone_number_id,
        is_active: s.is_active,
        whatsapp_number: s.whatsapp_number,
        has_access_token: !!s.access_token && s.access_token.length > 10,
        access_token_length: s.access_token?.length || 0
      })),
      api_test: apiTest
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal error', 
      details: String(error) 
    }, { status: 500 })
  }
}
