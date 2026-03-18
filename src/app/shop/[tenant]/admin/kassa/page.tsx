'use client'

import { useState } from 'react'

export default function KassaAdminPage({ params }: { params: { tenant: string } }) {
  const [display, setDisplay] = useState('0.00')
  const [leftOpen, setLeftOpen] = useState(true)

  const handleNumpad = (key: string) => {
    if (key === 'C') { setDisplay('0.00'); return }
    setDisplay(prev => {
      const digits = prev.replace('.', '')
      const newDigits = digits + key
      return (parseInt(newDigits) / 100).toFixed(2)
    })
  }

  return (
    <div className="-m-4 md:-m-6 -mb-96 flex flex-col bg-[#e3e3e3] overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>

      {/* ── Header: hamburger + Kassa + Vysion ── */}
      <div className="bg-white border-b border-gray-200 flex items-center px-4 h-14 flex-shrink-0 shadow-sm">
        <button onClick={() => setLeftOpen(o => !o)} className="p-2 hover:bg-gray-100 rounded-lg mr-3">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#3C4D6B] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-gray-800 text-lg">Kassa</span>
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-2xl font-black text-red-600 tracking-tight">Vysion</span>
          <span className="text-sm text-gray-400 self-end mb-0.5 ml-1">group</span>
        </div>
      </div>

      {/* ── Hoofd layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Links: inklapbaar */}
        {leftOpen && <div className="flex-1 bg-[#e3e3e3]" />}

        {/* Rechts: numpad paneel — vol tot onder */}
        <div className="w-[380px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 h-full overflow-y-auto">

          <button className="mx-3 mt-3 py-4 bg-[#2AAB8C] hover:bg-[#229A7E] text-white font-bold rounded-xl text-base transition-colors">
            Kies tafel...
          </button>

          <button className="mx-3 mt-2 py-4 bg-[#2AAB8C] hover:bg-[#229A7E] text-white font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2">
            🌍 HIER OPETEN
          </button>

          <div className="mx-3 mt-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-right">
            <span className="text-3xl font-bold text-gray-800">{display}</span>
          </div>

          <div className="mx-3 mt-3 grid grid-cols-4 gap-2 flex-1">
            <button onClick={() => handleNumpad('7')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">7</button>
            <button onClick={() => handleNumpad('8')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">8</button>
            <button onClick={() => handleNumpad('9')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">9</button>
            <button className="py-5 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-2xl transition-colors">+</button>

            <button onClick={() => handleNumpad('4')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">4</button>
            <button onClick={() => handleNumpad('5')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">5</button>
            <button onClick={() => handleNumpad('6')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">6</button>
            <button className="py-5 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-2xl transition-colors">-</button>

            <button onClick={() => handleNumpad('1')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">1</button>
            <button onClick={() => handleNumpad('2')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">2</button>
            <button onClick={() => handleNumpad('3')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">3</button>
            <button className="py-5 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-2xl transition-colors">×</button>

            <button onClick={() => handleNumpad('C')} className="py-5 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-2xl transition-colors">C</button>
            <button onClick={() => handleNumpad('0')} className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">0</button>
            <button className="py-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-2xl hover:bg-gray-100 transition-colors">.</button>
            <button className="py-5 bg-[#22c55e] hover:bg-[#16a34a] rounded-xl font-bold text-white text-2xl transition-colors">=</button>
          </div>

          <div className="mx-3 mt-3 flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="font-bold text-gray-700 text-lg">Totaal</span>
            <span className="font-bold text-gray-800 text-2xl">€0.00</span>
          </div>

          <div className="mx-3 mt-2 grid grid-cols-3 gap-2">
            <button className="flex flex-col items-center gap-1 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              <span className="text-sm font-semibold">Lade open</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              <span className="text-sm font-semibold">Print opnieuw</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span className="text-sm font-semibold">Verwijder</span>
            </button>
          </div>

          <button className="mx-3 mt-2 mb-3 py-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-300 text-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Afrekenen
          </button>
        </div>
      </div>
    </div>
  )
}
