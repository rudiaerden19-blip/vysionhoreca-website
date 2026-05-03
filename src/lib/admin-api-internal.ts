import { DEMO_TENANT_SLUG } from '@/lib/demo-links'

/** Postgrest turns aborted fetches into `{ error: { message: 'AbortError: ...' } }`. Throw so in-memory cache and UI don't treat that as real empty data. */
export function throwIfSupabaseFetchAborted(error: { message?: string } | null | undefined): void {
  const m = error?.message ?? ''
  if (
    /AbortError|The user aborted a request|signal is aborted|aborted without reason|^FetchError:/i.test(m)
  ) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }
}

export function isPublicDemoTenantSlug(slug: string): boolean {
  return slug === DEMO_TENANT_SLUG
}
