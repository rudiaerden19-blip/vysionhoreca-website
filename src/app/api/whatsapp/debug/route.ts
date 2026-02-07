import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Debug endpoint to check WhatsApp settings
export async function GET(request: NextRequest) {
  try {
    // Get all whatsapp_settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('tenant_slug, phone_number_id, is_active, whatsapp_number')
    
    if (settingsError) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: settingsError.message 
      }, { status: 500 })
    }

    // Check if test phone number ID exists
    const testPhoneId = '1027031347150330'
    const hasTestNumber = settings?.some(s => s.phone_number_id === testPhoneId)

    return NextResponse.json({
      status: 'ok',
      message: 'WhatsApp Debug Info',
      test_phone_number_id: testPhoneId,
      test_number_configured: hasTestNumber,
      total_settings: settings?.length || 0,
      settings: settings?.map(s => ({
        tenant: s.tenant_slug,
        phone_number_id: s.phone_number_id,
        is_active: s.is_active,
        whatsapp_number: s.whatsapp_number
      }))
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal error', 
      details: String(error) 
    }, { status: 500 })
  }
}
