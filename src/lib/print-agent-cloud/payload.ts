/** Zelfde limiet als Express JSON body in print agent server (512kb). */
export const PRINT_AGENT_JOB_PAYLOAD_MAX_BYTES = 512 * 1024

export function assertPrintJobPayloadSize(payload: Record<string, unknown>): string | null {
  try {
    const n = Buffer.byteLength(JSON.stringify(payload), 'utf8')
    if (n > PRINT_AGENT_JOB_PAYLOAD_MAX_BYTES) {
      return `Payload te groot (${n} bytes, max ${PRINT_AGENT_JOB_PAYLOAD_MAX_BYTES}).`
    }
    return null
  } catch {
    return 'Payload niet serialiseerbaar.'
  }
}
