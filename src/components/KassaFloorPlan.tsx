'use client'

import { useState, useEffect } from 'react'

export type TableShape = 'ROUND' | 'SQUARE' | 'RECTANGLE'
export type TableStatus = 'FREE' | 'OCCUPIED' | 'UNPAID'

export interface KassaTable {
  id: string
  number: string
  seats: number
  shape: TableShape
  x: number
  y: number
  rotation: number
  status: TableStatus
}

const STATUS_COLORS: Record<TableStatus, string> = {
  FREE: '#22c55e',
  OCCUPIED: '#3b82f6',
  UNPAID: '#f59e0b',
}

const STATUS_LABELS: Record<TableStatus, string> = {
  FREE: 'Vrij',
  OCCUPIED: 'Bezet',
  UNPAID: 'Onbetaald',
}

interface Props {
  tenant: string
  onSelectTable: (tableNumber: string) => void
  onClose: () => void
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function KassaFloorPlan({ tenant, onSelectTable, onClose }: Props) {
  const storageKey = `vysion_tables_${tenant}`
  const [tables, setTables] = useState<KassaTable[]>([])
  const [selected, setSelected] = useState<KassaTable | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addNumber, setAddNumber] = useState('')
  const [addSeats, setAddSeats] = useState(4)
  const [addShape, setAddShape] = useState<TableShape>('SQUARE')
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setTables(JSON.parse(raw))
    } catch { /* empty */ }
  }, [storageKey])

  const save = (updated: KassaTable[]) => {
    setTables(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const addTable = () => {
    if (!addNumber.trim()) return
    const t: KassaTable = {
      id: makeId(),
      number: addNumber.trim(),
      seats: addSeats,
      shape: addShape,
      x: 20 + Math.random() * 50,
      y: 20 + Math.random() * 50,
      rotation: 0,
      status: 'FREE',
    }
    save([...tables, t])
    setAddNumber('')
    setAddSeats(4)
    setShowAddModal(false)
  }

  const deleteTable = (id: string) => {
    save(tables.filter(t => t.id !== id))
    setSelected(null)
  }

  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging) return
    setSelected(null)
  }

  const handleDragStart = (id: string) => setDragging(id)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    save(tables.map(t => t.id === dragging ? { ...t, x: Math.max(5, Math.min(92, x)), y: Math.max(5, Math.min(90, y)) } : t))
    setDragging(null)
  }

  const renderTable = (t: KassaTable) => {
    const size = 70
    const color = STATUS_COLORS[t.status]
    const isSelected = selected?.id === t.id

    let shape: React.CSSProperties = {}
    let w = size, h = size
    if (t.shape === 'ROUND') {
      shape = { borderRadius: '50%' }
    } else if (t.shape === 'RECTANGLE') {
      w = size * 1.6; h = size * 0.7
      shape = { borderRadius: 8 }
    } else {
      shape = { borderRadius: 8 }
    }

    return (
      <div
        key={t.id}
        className="absolute cursor-pointer select-none"
        style={{
          left: `${t.x}%`,
          top: `${t.y}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: isSelected ? 10 : 1,
        }}
        draggable
        onDragStart={() => handleDragStart(t.id)}
        onClick={(e) => { e.stopPropagation(); setSelected(t) }}
      >
        <div
          style={{
            width: w,
            height: h,
            background: `linear-gradient(135deg, #D2691E 0%, #A0522D 40%, #8B4513 100%)`,
            boxShadow: isSelected
              ? `0 0 0 3px ${color}, 0 6px 20px rgba(0,0,0,0.5)`
              : '0 4px 12px rgba(0,0,0,0.4)',
            border: `3px solid ${isSelected ? color : '#5D3A1A'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            position: 'relative',
            transition: 'box-shadow 0.15s',
            ...shape,
          }}
        >
          <span className="text-white font-bold text-lg drop-shadow-lg">{t.number}</span>
          <span className="text-white/70 text-xs">{t.seats}p</span>
          {/* Status dot */}
          <div
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] z-50 flex flex-col">
      {/* Header */}
      <div className="h-14 flex-shrink-0 bg-[#16213e] border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-bold text-lg">Kies Tafel</h2>
          <span className="text-white/50 text-sm">
            {tables.filter(t => t.status === 'FREE').length}/{tables.length} vrij
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            + Tafel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            ✕ Sluiten
          </button>
        </div>
      </div>

      {/* Floor + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Floor plan */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundColor: '#4a4a4a',
            backgroundImage: `
              linear-gradient(to right, rgba(200,200,200,0.3) 0px, rgba(200,200,200,0.3) 2px, transparent 2px),
              linear-gradient(to bottom, rgba(200,200,200,0.3) 0px, rgba(200,200,200,0.3) 2px, transparent 2px)
            `,
            backgroundSize: '100px 100px',
          }}
          onClick={handleFloorClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {tables.map(renderTable)}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
              <span className="text-6xl mb-4">🪑</span>
              <p className="text-lg font-semibold">Nog geen tafels</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
              >
                + Voeg tafel toe
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {selected && (
          <div className="w-72 bg-[#16213e] border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-bold text-xl">Tafel {selected.number}</h3>
              <button onClick={() => setSelected(null)} className="text-white/50 hover:text-white text-xl">✕</button>
            </div>

            {/* Status */}
            <div className="p-4 border-b border-white/10">
              <div
                className="px-4 py-2 rounded-xl text-center font-bold text-white text-sm"
                style={{ backgroundColor: STATUS_COLORS[selected.status] }}
              >
                {STATUS_LABELS[selected.status]}
              </div>
              <p className="text-white/50 text-xs text-center mt-2">{selected.seats} plaatsen</p>
            </div>

            {/* Status toggle */}
            <div className="p-4 border-b border-white/10 space-y-2">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Status wijzigen</p>
              {(['FREE', 'OCCUPIED', 'UNPAID'] as TableStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => {
                    const updated = tables.map(t => t.id === selected.id ? { ...t, status: s } : t)
                    save(updated)
                    setSelected({ ...selected, status: s })
                  }}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${selected.status === s ? 'text-white' : 'text-white/50 bg-white/5 hover:bg-white/10'}`}
                  style={selected.status === s ? { backgroundColor: STATUS_COLORS[s] } : {}}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2 mt-auto">
              <button
                onClick={() => {
                  onSelectTable(selected.number)
                  onClose()
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors flex items-center justify-center gap-2"
              >
                🛒 Nieuwe bestelling
              </button>
              <button
                onClick={() => deleteTable(selected.id)}
                className="w-full py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold transition-colors"
              >
                🗑 Verwijder tafel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="h-10 flex-shrink-0 bg-[#16213e] border-t border-white/10 flex items-center justify-center gap-6 text-sm text-white/60">
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span>{STATUS_LABELS[s as TableStatus]}</span>
          </div>
        ))}
        <span className="text-white/30 ml-4 text-xs">Sleep tafels om te verplaatsen</span>
      </div>

      {/* Add table modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Tafel toevoegen</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Tafelnummer *</label>
                <input
                  autoFocus
                  value={addNumber}
                  onChange={e => setAddNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#3C4D6B] outline-none text-xl font-bold text-center"
                  placeholder="bv. 1, 2A, Toog"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Aantal plaatsen</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => setAddSeats(n)}
                      className={`py-2 rounded-xl font-bold transition-colors ${addSeats === n ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Vorm</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['SQUARE', '⬛ Vierkant'], ['ROUND', '⭕ Rond'], ['RECTANGLE', '▬ Rechthoek']] as const).map(([s, label]) => (
                    <button
                      key={s}
                      onClick={() => setAddShape(s)}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors ${addShape === s ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700">Annuleer</button>
              <button onClick={addTable} className="flex-2 flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors">Toevoegen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
