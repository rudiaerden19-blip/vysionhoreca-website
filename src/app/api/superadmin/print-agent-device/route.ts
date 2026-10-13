import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { generatePrintAgentDeviceToken, hashPrintAgentDeviceToken } from '@/lib/print-agent-cloud/token'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  name: z.string().max(120).optional(),
})

const RevokeSchema = z.object({
  action: z.literal('revoke'),
  deviceId: z.string().uuid(),
})

/** Eenmalig token tonen — opslaan als hash. Alleen superadmin (piloot). */
export async function POST(request: NextRequest) {
  const admin = await verifySuperAdminAccess(request)
  if (!admin.authorized) {
    return NextResponse.json({ ok: false, error: admin.error || 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const revokeParsed = RevokeSchema.safeParse(body)
  if (revokeParsed.success) {
    const supabaseRevoke = getServerSupabaseClient()
    if (!supabaseRevoke) {
      return NextResponse.json({ ok: false, error: 'Database niet geconfigureerd.' }, { status: 503 })
    }
    const { error: revErr } = await supabaseRevoke
      .from('print_agent_devices')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', revokeParsed.data.deviceId)
      .is('revoked_at', null)
    if (revErr) {
      return NextResponse.json({ ok: false, error: revErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, revoked: true })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database niet geconfigureerd.' }, { status: 503 })
  }

  const token = generatePrintAgentDeviceToken()
  const tokenHash = hashPrintAgentDeviceToken(token)

  const { data, error } = await supabase
    .from('print_agent_devices')
    .insert({
      tenant_slug: parsed.data.tenantSlug.trim(),
      token_hash: tokenHash,
      name: parsed.data.name?.trim() || null,
    })
    .select('id, tenant_slug, created_at')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    device: data,
    token,
    warning: 'Bewaar dit token nu — het wordt niet opnieuw getoond.',
  })
}
