/** Cloud print job — zelfde payload-structuur als POST /print (VysionPrintAgentBody). */

export type PrintAgentJobStatus = 'pending' | 'processing' | 'printed' | 'failed'

export type PrintAgentJobRow = {
  id: string
  tenant_slug: string
  idempotency_key: string
  status: PrintAgentJobStatus
  payload: Record<string, unknown>
  source: string
  created_at: string
  claimed_at: string | null
  printed_at: string | null
  failed_at: string | null
  error_message: string | null
  processing_token: string | null
}

export type PrintAgentDeviceRow = {
  id: string
  tenant_slug: string
  token_hash: string
  name: string | null
  created_at: string
  revoked_at: string | null
}
