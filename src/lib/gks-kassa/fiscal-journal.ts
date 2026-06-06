'use client'

import type { GksFiscalJournalEntry } from '@/lib/gks-kassa/fdm-types'
import { offlineDbGet, offlineDbSet } from '@/lib/gks-kassa/offline-db'

function journalDbKey(tenantSlug: string) {
  return `gks_fiscal_journal_v1_${tenantSlug}`
}

export async function appendFiscalJournalEntry(
  tenantSlug: string,
  entry: Omit<GksFiscalJournalEntry, 'id' | 'tenantSlug' | 'createdAt'>,
): Promise<GksFiscalJournalEntry> {
  const full: GksFiscalJournalEntry = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    tenantSlug,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  const key = journalDbKey(tenantSlug)
  const prev = (await offlineDbGet<GksFiscalJournalEntry[]>(key)) ?? []
  const next = [...prev, full].slice(-2000)
  await offlineDbSet(key, next)
  try {
    const lsKey = `gks_fiscal_journal_backup_${tenantSlug}`
    localStorage.setItem(lsKey, JSON.stringify(next.slice(-200)))
  } catch {
    /* quota */
  }
  return full
}

export async function listFiscalJournalEntries(tenantSlug: string, limit = 100): Promise<GksFiscalJournalEntry[]> {
  const key = journalDbKey(tenantSlug)
  const rows = (await offlineDbGet<GksFiscalJournalEntry[]>(key)) ?? []
  return rows.slice(-limit)
}
