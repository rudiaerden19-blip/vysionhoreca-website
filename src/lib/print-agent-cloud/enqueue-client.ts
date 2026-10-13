import type { PrintAgentJobStatus } from '@/lib/print-agent-cloud/types'

export type EnqueuePrintJobApiResponse =
  | {
      ok: true
      created: boolean
      job: { id: string; status: PrintAgentJobStatus; idempotency_key: string }
    }
  | { ok: false; error?: string }

export async function postPrintAgentEnqueue(input: {
  tenantSlug: string
  idempotencyKey: string
  payload: Record<string, unknown>
  source?: string
}): Promise<{ ok: true; response: EnqueuePrintJobApiResponse & { ok: true } } | { ok: false; error: string }> {
  let r: Response
  try {
    r = await fetch('/api/print-agent/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        tenant: input.tenantSlug,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        source: input.source ?? 'kassa-ipad',
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      error: `Geen verbinding met VYSION (cloud print). Bon niet in wachtrij geplaatst.\n\n${msg}`,
    }
  }

  let data: EnqueuePrintJobApiResponse | null = null
  try {
    data = (await r.json()) as EnqueuePrintJobApiResponse
  } catch {
    data = null
  }

  if (!r.ok || !data || data.ok !== true) {
    const err =
      (data && 'error' in data && data.error ? String(data.error) : '') ||
      `HTTP ${r.status} ${r.statusText}`.trim()
    return {
      ok: false,
      error: `Cloud print mislukt: ${err}`,
    }
  }

  return { ok: true, response: data }
}

export function cloudEnqueueJobToUserResult(job: {
  id: string
  status: PrintAgentJobStatus
}):
  | { ok: true; delivery: 'cloud_queued'; jobId: string }
  | { ok: false; error: string } {
  if (job.status === 'failed') {
    return {
      ok: false,
      error:
        'Deze bon stond al in de wachtrij maar is mislukt. Er is niet opnieuw automatisch afgedrukt. Vraag een beheerder om een gecontroleerde herdruk.',
    }
  }
  if (job.status === 'printed') {
    return {
      ok: true,
      delivery: 'cloud_queued',
      jobId: job.id,
    }
  }
  return {
    ok: true,
    delivery: 'cloud_queued',
    jobId: job.id,
  }
}
