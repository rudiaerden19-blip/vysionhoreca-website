import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Secure endpoint to fetch gift card code ONLY after payment is confirmed
 * This prevents exposing the code before payment completes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const giftCardId = searchParams.get('id')
    const tenantSlug = searchParams.get('tenant')

    if (!giftCardId || !tenantSlug) {
      return NextResponse.json(
        { error: 'Gift card ID en tenant zijn verplicht' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database niet geconfigureerd' },
        { status: 503 }
      )
    }

    // Fetch gift card - ONLY return code if status is 'paid' or 'active'
    const { data: giftCard, error } = await supabase
      .from('gift_cards')
      .select('id, code, amount, status, recipient_name, recipient_email, sender_name, occasion, personal_message')
      .eq('id', giftCardId)
      .eq('tenant_slug', tenantSlug)
      .single()

    if (error || !giftCard) {
      return NextResponse.json(
        { error: 'Cadeaubon niet gevonden' },
        { status: 404 }
      )
    }

    // SECURITY: Only return the code if payment is confirmed
    if (giftCard.status !== 'paid' && giftCard.status !== 'active') {
      return NextResponse.json(
        { error: 'Betaling nog niet bevestigd' },
        { status: 402 } // Payment Required
      )
    }

    return NextResponse.json({
      code: giftCard.code,
      amount: giftCard.amount,
      recipientName: giftCard.recipient_name,
      recipientEmail: giftCard.recipient_email,
      senderName: giftCard.sender_name,
      occasion: giftCard.occasion,
      personalMessage: giftCard.personal_message,
    })

  } catch (error) {
    console.error('Get gift card code error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}
