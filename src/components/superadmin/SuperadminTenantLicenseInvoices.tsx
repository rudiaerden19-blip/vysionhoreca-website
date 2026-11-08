'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'
import {
  defaultLicenseInvoiceDescription,
  formatLicenseInvoiceAmounts,
  licenseInvoiceExclForForm,
  licenseInvoiceInclFromExcl,
  licenseInvoiceVatFromExcl,
  LICENSE_INVOICE_VAT_RATE,
  suggestNextLicenseInvoiceNumber,
  type TenantLicenseInvoiceRow,
  type TenantLicenseInvoiceStatus,
} from '@/lib/tenant-license-invoice'

const emptyForm = () => ({
  invoice_number: '',
  amount: '99',
  status: 'paid' as TenantLicenseInvoiceStatus,
  description: defaultLicenseInvoiceDescription('Premium'),
  invoice_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  paid_at: new Date().toISOString().slice(0, 10),
})

export function SuperadminTenantLicenseInvoices({ tenantSlug }: { tenantSlug: string }) {
  const [invoices, setInvoices] = useState<TenantLicenseInvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    const res = await authFetch('/api/superadmin/tenants', {
      method: 'POST',
      body: JSON.stringify({ action: 'list_license_invoices', slug: tenantSlug }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(json.invoices)) {
      setInvoices(json.invoices as TenantLicenseInvoiceRow[])
    } else {
      setInvoices([])
    }
    setLoading(false)
  }, [tenantSlug])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  const resetForm = () => {
    setEditingId(null)
    const next = emptyForm()
    next.invoice_number = suggestNextLicenseInvoiceNumber(tenantSlug, [])
    setForm(next)
  }

  useEffect(() => {
    if (!loading && !editingId) {
      setForm((f) => ({
        ...f,
        invoice_number:
          f.invoice_number || suggestNextLicenseInvoiceNumber(tenantSlug, invoices),
      }))
    }
  }, [loading, editingId, tenantSlug, invoices])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const amount = Number(form.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Vul een geldig bedrag in.')
      setSaving(false)
      return
    }
    const res = await authFetch('/api/superadmin/tenants', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save_license_invoice',
        slug: tenantSlug,
        invoice: {
          id: editingId ?? undefined,
          invoice_number: form.invoice_number,
          amount,
          status: form.status,
          description: form.description,
          invoice_date: form.invoice_date,
          due_date: form.due_date || form.invoice_date,
          paid_at: form.status === 'paid' ? form.paid_at || form.invoice_date : null,
        },
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(`Opslaan mislukt: ${json?.error || res.status}`)
      setSaving(false)
      return
    }
    await loadInvoices()
    resetForm()
    setSaving(false)
  }

  function startEdit(row: TenantLicenseInvoiceRow) {
    setEditingId(row.id)
    setForm({
      invoice_number: row.invoice_number,
      amount: String(licenseInvoiceExclForForm(row)),
      status: row.status as TenantLicenseInvoiceStatus,
      description: row.description || '',
      invoice_date: row.created_at.slice(0, 10),
      due_date: row.due_date?.slice(0, 10) || '',
      paid_at: row.paid_at?.slice(0, 10) || row.created_at.slice(0, 10),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Deze licentiefactuur verwijderen?')) return
    const res = await authFetch('/api/superadmin/tenants', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete_license_invoice', slug: tenantSlug, invoiceId: id }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(`Verwijderen mislukt: ${json?.error || res.status}`)
      return
    }
    await loadInvoices()
    if (editingId === id) resetForm()
  }

  const paidTotal = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + formatLicenseInvoiceAmounts(i).incl, 0)

  const formExcl = Number(String(form.amount).replace(',', '.'))
  const formExclValid = Number.isFinite(formExcl) && formExcl > 0
  const formVat = formExclValid ? licenseInvoiceVatFromExcl(formExcl) : 0
  const formIncl = formExclValid ? licenseInvoiceInclFromExcl(formExcl) : 0

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-white">Licentiefacturen (tenant)</h2>
        <p className="text-slate-400 text-sm">
          Verschijnt in tenant → <strong className="text-slate-200">Licentie / Betalingsoverzicht</strong>
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6 text-sm">
        <div className="rounded-xl bg-slate-900/60 border border-slate-600 p-3">
          <p className="text-slate-400">Betaalde facturen</p>
          <p className="text-2xl font-bold text-emerald-400">
            {invoices.filter((i) => i.status === 'paid').length}
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/60 border border-slate-600 p-3">
          <p className="text-slate-400">Totaal betaald</p>
          <p className="text-2xl font-bold text-white">€{paidTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-slate-900/60 border border-slate-600 p-3">
          <p className="text-slate-400">Openstaand</p>
          <p className="text-2xl font-bold text-amber-400">
            {invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').length}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3 mb-6 border border-slate-600 rounded-xl p-4 bg-slate-900/40">
        <p className="text-white font-semibold text-sm">
          {editingId ? 'Factuur bewerken' : 'Nieuwe licentiefactuur'}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs text-slate-400">
            Factuurnummer
            <input
              required
              value={form.invoice_number}
              onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Bedrag excl. {Math.round(LICENSE_INVOICE_VAT_RATE * 100)}% BTW (€)
            <input
              required
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
            />
            {formExclValid ? (
              <span className="mt-1 block text-emerald-300 text-xs">
                BTW €{formVat.toFixed(2)} → <strong>€{formIncl.toFixed(2)} incl. BTW</strong>
              </span>
            ) : null}
          </label>
          <label className="block text-xs text-slate-400">
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as TenantLicenseInvoiceStatus }))
              }
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
            >
              <option value="paid">Betaald</option>
              <option value="pending">Openstaand</option>
              <option value="overdue">Achterstallig</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Factuurdatum
            <input
              type="date"
              value={form.invoice_date}
              onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
            />
          </label>
          {form.status === 'paid' ? (
            <label className="block text-xs text-slate-400">
              Betaald op
              <input
                type="date"
                value={form.paid_at}
                onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
              />
            </label>
          ) : (
            <label className="block text-xs text-slate-400">
              Vervaldatum
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
              />
            </label>
          )}
          <label className="block text-xs text-slate-400 sm:col-span-2">
            Omschrijving
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Opslaan…' : editingId ? 'Bijwerken' : 'Toevoegen'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
            >
              Annuleren
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-400 text-sm">Laden…</p>
      ) : invoices.length === 0 ? (
        <p className="text-slate-500 text-sm">Nog geen licentiefacturen voor deze zaak.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-600">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2">Nr</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Bedrag</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {invoices.map((row) => (
                <tr key={row.id} className="text-slate-200">
                  <td className="px-3 py-2 font-mono text-xs">{row.invoice_number}</td>
                  <td className="px-3 py-2">
                    {new Date(
                      row.status === 'paid' && row.paid_at ? row.paid_at : row.created_at,
                    ).toLocaleDateString('nl-BE')}
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      const a = formatLicenseInvoiceAmounts(row)
                      return (
                        <span>
                          €{a.incl.toFixed(2)} incl.
                          <span className="block text-xs text-slate-400">
                            excl. €{a.excl.toFixed(2)} + BTW €{a.vat.toFixed(2)}
                          </span>
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-2 capitalize">{row.status}</td>
                  <td className="px-3 py-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="text-orange-400 hover:text-orange-300 text-xs font-medium"
                    >
                      Wijzig
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(row.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-medium"
                    >
                      Verwijder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
