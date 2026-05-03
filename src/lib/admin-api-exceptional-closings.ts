import { supabase } from './supabase'
import { throwIfSupabaseFetchAborted } from './admin-api-internal'

/** Of een kalenderdag binnen een uitzonderlijke sluiting valt (inclusief periode date … date_end). */
export function isDateInExceptionalClosing(dateStr: string, closings: ExceptionalClosing[]): boolean {
  if (!dateStr || !closings?.length) return false
  return closings.some((c) => {
    const end = c.date_end && c.date_end >= c.date ? c.date_end : c.date
    return dateStr >= c.date && dateStr <= end
  })
}

export interface ExceptionalClosing {
  id?: string
  tenant_slug: string
  date: string // YYYY-MM-DD (startdatum)
  date_end?: string | null // YYYY-MM-DD (einddatum, null = 1 dag)
  reason: string
  is_holiday: boolean
  holiday_key?: string | null
  created_at?: string
}

export async function getExceptionalClosings(
  tenantSlug: string,
  signal?: AbortSignal,
): Promise<ExceptionalClosing[]> {
  const base = supabase
    .from('exceptional_closings')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('date', { ascending: true })
  const { data, error } = signal ? await base.abortSignal(signal) : await base

  if (error) {
    throwIfSupabaseFetchAborted(error)
    console.error('Error fetching exceptional closings:', error)
    return []
  }
  return data || []
}

export async function saveExceptionalClosing(closing: ExceptionalClosing): Promise<ExceptionalClosing | null> {
  const payload: Record<string, unknown> = {
    tenant_slug: closing.tenant_slug,
    date: closing.date,
    reason: closing.reason,
    is_holiday: closing.is_holiday,
    holiday_key: closing.holiday_key ?? null,
  }
  if (closing.date_end) payload.date_end = closing.date_end

  const { data, error } = await supabase
    .from('exceptional_closings')
    .upsert(payload, { onConflict: 'tenant_slug,date' })
    .select()
    .single()

  if (error) {
    console.error('Error saving exceptional closing:', error)
    throw new Error(error.message || 'Onbekende fout')
  }
  return data
}

export async function deleteExceptionalClosing(tenantSlug: string, date: string): Promise<boolean> {
  const { error } = await supabase
    .from('exceptional_closings')
    .delete()
    .eq('tenant_slug', tenantSlug)
    .eq('date', date)

  if (error) {
    console.error('Error deleting exceptional closing:', error)
    return false
  }
  return true
}
