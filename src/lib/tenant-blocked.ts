import { supabase } from '@/lib/supabase'

/** Fail-open: bij fout of ontbrekende rij nooit blokkeren — betalende zaken mogen niet per ongeluk op slot. */
export async function isTenantBlocked(tenantSlug: string): Promise<boolean> {
  const slug = tenantSlug.trim()
  if (!slug || !supabase) return false
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('is_blocked')
      .eq('slug', slug)
      .maybeSingle()
    if (error || !data) return false
    return (data as { is_blocked?: boolean | null }).is_blocked === true
  } catch {
    return false
  }
}
