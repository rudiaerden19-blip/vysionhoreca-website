'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

interface LabelItem {
  id: string
  created_at: string
  order_id: string
  product_name: string
  quantity: number
  customer_name: string | null
  options_text: string | null
  notes: string | null
  group_member_name: string | null
  department: string | null
  status: string
}

interface LabelSettings {
  label_printer_type: string
  label_auto_print: boolean
  label_width_mm: number
  label_height_mm: number
}

export default function LabelsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [labels, setLabels] = useState<LabelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<LabelSettings>({
    label_printer_type: 'browser',
    label_auto_print: false,
    label_width_mm: 62,
    label_height_mm: 29
  })
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set())

  const loadLabels = useCallback(async () => {
    const { data } = await supabase
      .from('label_queue')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    
    setLabels(data || [])
    setLoading(false)
  }, [params.tenant])

  useEffect(() => {
    loadLabels()
    loadSettings()
    
    // Subscribe to new labels
    const channel = supabase
      .channel('label_queue_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'label_queue',
        filter: `tenant_slug=eq.${params.tenant}`
      }, () => {
        loadLabels()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.tenant, loadLabels])

  async function loadSettings() {
    const { data } = await supabase
      .from('tenants')
      .select('label_printer_type, label_auto_print, label_width_mm, label_height_mm')
      .eq('slug', params.tenant)
      .single()
    
    if (data) {
      setSettings({
        label_printer_type: data.label_printer_type || 'browser',
        label_auto_print: data.label_auto_print || false,
        label_width_mm: data.label_width_mm || 62,
        label_height_mm: data.label_height_mm || 29
      })
    }
  }

  async function markAsPrinted(ids: string[]) {
    await supabase
      .from('label_queue')
      .update({ status: 'printed', printed_at: new Date().toISOString() })
      .in('id', ids)
    
    loadLabels()
    setSelectedLabels(new Set())
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedLabels)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedLabels(newSelected)
  }

  function selectAll() {
    if (selectedLabels.size === labels.length) {
      setSelectedLabels(new Set())
    } else {
      setSelectedLabels(new Set(labels.map(l => l.id)))
    }
  }

  function printLabels(labelsToPrint: LabelItem[]) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const labelsHtml = labelsToPrint.map(label => `
      <div class="label" style="
        width: ${settings.label_width_mm}mm;
        height: ${settings.label_height_mm}mm;
        border: 1px dashed #ccc;
        padding: 3mm;
        margin: 2mm;
        display: inline-block;
        box-sizing: border-box;
        font-family: Arial, sans-serif;
        page-break-inside: avoid;
        overflow: hidden;
      ">
        <div style="font-size: 14pt; font-weight: bold; margin-bottom: 2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${label.product_name}
        </div>
        ${label.group_member_name || label.customer_name ? `
          <div style="font-size: 10pt; margin-bottom: 1mm;">
            👤 ${label.group_member_name || label.customer_name}
            ${label.department ? ` - ${label.department}` : ''}
          </div>
        ` : ''}
        ${label.options_text && label.options_text !== '{}' && label.options_text !== 'null' ? `
          <div style="font-size: 8pt; color: #666; margin-bottom: 1mm;">
            ${formatOptions(label.options_text)}
          </div>
        ` : ''}
        ${label.notes ? `
          <div style="font-size: 8pt; font-style: italic; color: #888;">
            📝 ${label.notes}
          </div>
        ` : ''}
      </div>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Labels - ${params.tenant}</title>
          <style>
            @page { margin: 5mm; }
            body { margin: 0; padding: 0; }
            .label { vertical-align: top; }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()

    // Mark as printed
    markAsPrinted(labelsToPrint.map(l => l.id))
  }

  function formatOptions(optionsText: string): string {
    try {
      const options = JSON.parse(optionsText)
      if (typeof options === 'object' && options !== null) {
        return Object.entries(options)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      }
      return ''
    } catch {
      return optionsText
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏷️ Label Printer</h1>
          <p className="text-gray-600">Print stickers voor producten</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedLabels.size > 0 && (
            <button
              onClick={() => printLabels(labels.filter(l => selectedLabels.has(l.id)))}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium"
            >
              🖨️ Print geselecteerd ({selectedLabels.size})
            </button>
          )}
          {labels.length > 0 && (
            <button
              onClick={() => printLabels(labels)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium"
            >
              🖨️ Print alles ({labels.length})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-purple-600">{labels.length}</div>
          <div className="text-gray-500">Te printen</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-gray-900">{settings.label_width_mm}×{settings.label_height_mm}</div>
          <div className="text-gray-500">Label formaat (mm)</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-2xl font-bold text-gray-900 capitalize">{settings.label_printer_type}</div>
          <div className="text-gray-500">Printer type</div>
        </div>
      </div>

      {/* Labels Queue */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : labels.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 rounded-2xl p-12 text-center"
        >
          <span className="text-6xl mb-4 block">✅</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Geen labels te printen</h2>
          <p className="text-gray-600">Nieuwe labels verschijnen hier automatisch bij bestellingen</p>
        </motion.div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLabels.size === labels.length}
                onChange={selectAll}
                className="w-5 h-5 rounded"
              />
              <span className="font-medium">Selecteer alles</span>
            </label>
          </div>
          
          <div className="divide-y">
            {labels.map((label) => (
              <motion.div
                key={label.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 flex items-center gap-4 hover:bg-gray-50 ${
                  selectedLabels.has(label.id) ? 'bg-purple-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedLabels.has(label.id)}
                  onChange={() => toggleSelect(label.id)}
                  className="w-5 h-5 rounded"
                />
                
                <div className="flex-1">
                  <div className="font-bold text-gray-900">{label.product_name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-3">
                    {(label.group_member_name || label.customer_name) && (
                      <span>👤 {label.group_member_name || label.customer_name}</span>
                    )}
                    {label.department && <span>📁 {label.department}</span>}
                    <span>🕐 {formatTime(label.created_at)}</span>
                  </div>
                  {label.notes && (
                    <div className="text-sm text-gray-400 mt-1">📝 {label.notes}</div>
                  )}
                </div>
                
                <button
                  onClick={() => printLabels([label])}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
                >
                  🖨️ Print
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm">
          Label formaat aanpassen? Ga naar{' '}
          <a href={`/shop/${params.tenant}/admin/profiel`} className="text-blue-600 hover:underline">
            Zaak profiel
          </a>
        </p>
      </div>
    </div>
  )
}
