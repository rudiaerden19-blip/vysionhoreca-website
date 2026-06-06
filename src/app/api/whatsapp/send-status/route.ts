import { NextRequest, NextResponse } from 'next/server'
import { getApiRouteSupabase } from '@/lib/api-route-supabase'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

// Status types and their messages
const STATUS_MESSAGES: Record<string, { nl: string; emoji: string }> = {
  confirmed: {
    emoji: '✅',
    nl: `✅ *Bestelling Bevestigd!*

Je bestelling #{orderNumber} is bevestigd door {businessName}!

We zijn ermee bezig en laten je weten wanneer het klaar is. 🍟`
  },
  preparing: {
    emoji: '👨‍🍳',
    nl: `👨‍🍳 *Bestelling wordt bereid!*

Je bestelling #{orderNumber} wordt nu klaargemaakt.

Nog even geduld... ⏳`
  },
  ready: {
    emoji: '🔔',
    nl: `🔔 *Je bestelling is KLAAR!*

Bestelnummer: #{orderNumber}

Je kunt je bestelling nu ophalen bij {businessName}! 🍟

Tot zo! 👋`
  },
  delivering: {
    emoji: '🚗',
    nl: `🚗 *Onderweg!*

Je bestelling #{orderNumber} is onderweg naar jou!

Bezorger is vertrokken. 📍`
  },
  delivered: {
    emoji: '✅',
    nl: `✅ *Bezorgd!*

Je bestelling #{orderNumber} is bezorgd.

Bedankt voor je bestelling bij {businessName}! 
Smakelijk! 😋`
  },
  cancelled: {
    emoji: '❌',
    nl: `❌ *Bestelling Geannuleerd*

Je bestelling #{orderNumber} is helaas geannuleerd.

Neem contact op met {businessName} voor meer informatie.`
  },
  rejected: {
    emoji: '❌',
    nl: `❌ *Bestelling Afgewezen*

Je bestelling #{orderNumber} is helaas afgewezen.

Reden: {rejectionReason}

Neem contact op met {businessName} voor meer informatie. Onze excuses voor het ongemak.`
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const db = getApiRouteSupabase()
    if (!db.ok) return db.response
    const supabaseAdmin = db.supabase
    const body = await request.json()
    console.log('📨 WhatsApp send-status called with:', JSON.stringify(body))

    const { tenantSlug, customerPhone, orderNumber, status, rejectionReason } = body

    if (!tenantSlug || !customerPhone || !orderNumber || !status) {
      console.log('❌ Missing required fields:', { tenantSlug, customerPhone, orderNumber, status })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Auth: alleen ingelogde zaak-eigenaar of superadmin ─────────────────
    // Status-updates worden aangeroepen vanuit admin/bestellingen, keuken
    // en kassa — allemaal achter de admin-login. Zonder deze check kon
    // iedereen via dit endpoint spam sturen via de tenant's WhatsApp-token.
    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      logger.warn('whatsapp/send-status: unauthorized', { requestId, tenantSlug })
      return NextResponse.json(
        { error: access.error || 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    // ── Rate-limit per tenant (extra defense-in-depth) ─────────────────────
    const actorId =
      request.headers.get('x-business-id') ||
      request.headers.get('x-superadmin-id') ||
      'anon'
    const rl = await checkRateLimit(apiRateLimiter, `wa-status:${tenantSlug}:${actorId}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel statusberichten. Probeer over 1 minuut opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Normalize tenant slug (remove hyphens for database lookup)
    const normalizedSlug = tenantSlug.replace(/-/g, '')

    // Check if status is valid
    if (!STATUS_MESSAGES[status]) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get tenant WhatsApp settings (try normalized slug first, then original)
    let { data: tenant } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('*')
      .eq('tenant_slug', normalizedSlug)
      .eq('is_active', true)
      .single()

    // Fallback to original slug if not found
    if (!tenant) {
      const { data: tenantAlt } = await supabaseAdmin
        .from('whatsapp_settings')
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .eq('is_active', true)
        .single()
      tenant = tenantAlt
    }

    if (!tenant) {
      console.log('❌ No WhatsApp settings found for tenant:', tenantSlug, 'or', normalizedSlug)
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 404 })
    }

    // Get tenant name
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('slug', normalizedSlug)
      .single()

    const businessName = tenantData?.name || tenantSlug

    // Format phone number
    let formattedPhone = customerPhone.replace(/\s+/g, '').replace(/^0/, '32').replace(/^\+/, '')

    // Get the message template and replace placeholders
    const messageTemplate = STATUS_MESSAGES[status].nl
    const message = messageTemplate
      .replace(/{orderNumber}/g, orderNumber)
      .replace(/{businessName}/g, businessName)
      .replace(/{rejectionReason}/g, rejectionReason || 'Niet gespecificeerd')

    // ── Idempotency-lock ───────────────────────────────────────────────────
    // Voorkomt dubbele berichten als een admin 2× klikt of het netwerk een
    // request retry'd. Unique key = (tenant_slug, kind, dedupe_key).
    // Faalt Meta straks: row weer verwijderen zodat een nieuwe poging mag.
    const dedupeKey = `${orderNumber}:${status}`
    const dedupKind = `status:${status}`
    let dedupRowId: string | null = null
    try {
      const ins = await supabaseAdmin
        .from('whatsapp_send_log')
        .insert({
          tenant_slug: tenantSlug,
          kind: dedupKind,
          dedupe_key: dedupeKey,
          phone: customerPhone,
        })
        .select('id')
        .maybeSingle()

      if (ins.error) {
        const code = (ins.error as { code?: string }).code
        const msg = ins.error.message || ''
        if (code === '23505' || /duplicate key/i.test(msg)) {
          logger.info('whatsapp/send-status: deduped', { requestId, tenantSlug, dedupeKey, dedupKind })
          return NextResponse.json({ success: true, deduped: true })
        }
        // Andere fout (bv. tabel ontbreekt nog vóór SQL-migratie). Loggen
        // en doorgaan zonder dedup zodat de feature niet ineens kapot is.
        logger.warn('whatsapp/send-status: dedup insert non-fatal error', {
          requestId,
          code,
          message: msg,
        })
      } else {
        dedupRowId = (ins.data as { id?: string } | null)?.id ?? null
      }
    } catch (e) {
      logger.warn('whatsapp/send-status: dedup insert threw', {
        requestId,
        error: e instanceof Error ? e.message : String(e),
      })
    }

    // Send the message via WhatsApp
    const response = await fetch(`${WHATSAPP_API_URL}/${tenant.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenant.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { body: message }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ WhatsApp API error:', error)
      // Rollback dedup-row zodat een retry mogelijk is.
      if (dedupRowId) {
        await supabaseAdmin.from('whatsapp_send_log').delete().eq('id', dedupRowId)
      }
      return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
    }

    console.log(`✅ Status update "${status}" sent to ${formattedPhone}`)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Error sending status update:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
