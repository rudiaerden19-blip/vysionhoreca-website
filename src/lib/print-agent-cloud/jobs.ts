import { randomUUID } from 'crypto'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import type { PrintAgentJobRow, PrintAgentJobStatus } from '@/lib/print-agent-cloud/types'
import { hashPrintAgentDeviceToken, isValidPrintAgentDeviceTokenFormat } from '@/lib/print-agent-cloud/token'

export type ResolveDeviceResult =
  | { ok: true; tenantSlug: string; deviceId: string }
  | { ok: false; error: string }

export async function resolvePrintAgentDeviceFromToken(token: string): Promise<ResolveDeviceResult> {
  if (!isValidPrintAgentDeviceTokenFormat(token)) {
    return { ok: false, error: 'Ongeldig agent-token.' }
  }
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Database niet geconfigureerd.' }

  const tokenHash = hashPrintAgentDeviceToken(token)
  const { data, error } = await supabase
    .from('print_agent_devices')
    .select('id, tenant_slug, revoked_at')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data || data.revoked_at) return { ok: false, error: 'Onbekend of ingetrokken agent-token.' }
  return { ok: true, tenantSlug: String(data.tenant_slug), deviceId: String(data.id) }
}

export async function isCloudPrintEnabledForTenant(tenantSlug: string): Promise<boolean> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return false
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('kassa_cloud_print_enabled')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  if (error) return false
  return (data as { kassa_cloud_print_enabled?: boolean } | null)?.kassa_cloud_print_enabled === true
}

export type EnqueuePrintJobInput = {
  tenantSlug: string
  idempotencyKey: string
  payload: Record<string, unknown>
  source?: string
}

export async function enqueuePrintAgentJob(
  input: EnqueuePrintJobInput,
): Promise<{ ok: true; job: PrintAgentJobRow; created: boolean } | { ok: false; error: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Database niet geconfigureerd.' }

  const key = input.idempotencyKey.trim()
  if (!key || key.length > 200) return { ok: false, error: 'Ongeldige idempotency key.' }

  const { data: existing, error: exErr } = await supabase
    .from('print_agent_jobs')
    .select('*')
    .eq('tenant_slug', input.tenantSlug)
    .eq('idempotency_key', key)
    .maybeSingle()

  if (exErr) return { ok: false, error: exErr.message }
  if (existing) {
    return { ok: true, job: existing as PrintAgentJobRow, created: false }
  }

  const { data, error } = await supabase
    .from('print_agent_jobs')
    .insert({
      tenant_slug: input.tenantSlug,
      idempotency_key: key,
      payload: input.payload,
      source: input.source || 'api',
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: again } = await supabase
        .from('print_agent_jobs')
        .select('*')
        .eq('tenant_slug', input.tenantSlug)
        .eq('idempotency_key', key)
        .maybeSingle()
      if (again) return { ok: true, job: again as PrintAgentJobRow, created: false }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, job: data as PrintAgentJobRow, created: true }
}

export async function claimNextPrintAgentJob(
  tenantSlug: string,
): Promise<{ ok: true; job: PrintAgentJobRow | null } | { ok: false; error: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Database niet geconfigureerd.' }

  const processingToken = randomUUID()
  const { data, error } = await supabase.rpc('claim_next_print_agent_job', {
    p_tenant_slug: tenantSlug,
    p_processing_token: processingToken,
  })

  if (error) return { ok: false, error: error.message }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { ok: true, job: null }
  return { ok: true, job: row as PrintAgentJobRow }
}

export async function ackPrintAgentJob(input: {
  tenantSlug: string
  jobId: string
  processingToken: string
  status: Extract<PrintAgentJobStatus, 'printed' | 'failed'>
  errorMessage?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Database niet geconfigureerd.' }

  const patch: Record<string, unknown> = {
    status: input.status,
    error_message: input.errorMessage?.slice(0, 2000) || null,
  }
  if (input.status === 'printed') patch.printed_at = new Date().toISOString()
  if (input.status === 'failed') patch.failed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('print_agent_jobs')
    .update(patch)
    .eq('id', input.jobId)
    .eq('tenant_slug', input.tenantSlug)
    .eq('processing_token', input.processingToken)
    .eq('status', 'processing')
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Job niet gevonden of al afgehandeld.' }
  return { ok: true }
}
