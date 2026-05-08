/** Lokale Vysion Print Agent (Windows): http://127.0.0.1:9742 */

const DEFAULT_AGENT_ORIGIN = 'http://127.0.0.1:9742'

export type VysionPrintAgentBody = {
  winkelnaam?: string
  storeName?: string
  bonInhoud: string
  receiptText?: string
}

export async function sendToVysionPrintAgent(
  body: VysionPrintAgentBody,
  origin = DEFAULT_AGENT_ORIGIN
): Promise<boolean> {
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winkelnaam: body.winkelnaam ?? body.storeName,
        bonInhoud: body.bonInhoud ?? body.receiptText ?? '',
      }),
      mode: 'cors',
      credentials: 'omit',
    }
    // Private Network Access / localhost vanaf https (Experimenteel in sommige browsers)
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'

    const r = await fetch(`${origin.replace(/\/$/, '')}/print`, init)
    const data = (await r.json().catch(() => null)) as { success?: boolean } | null
    return r.ok && data?.success === true
  } catch {
    return false
  }
}
