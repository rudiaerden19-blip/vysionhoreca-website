'use client'

import { useState } from 'react'

export default function KassaPage({ params }: { params: { tenant: string } }) {
  const [display, setDisplay] = useState('0.00')

  const handleNumpad = (key: string) => {
    if (key === 'C') { setDisplay('0.00'); return }
    if (key === '⌫') {
      setDisplay(prev => {
        const digits = prev.replace('.', '')
        const newDigits = digits.slice(0, -1) || '0'
        return (parseInt(newDigits) / 100).toFixed(2)
      })
      return
    }
    if (key === '.') return
    setDisplay(prev => {
      const digits = prev.replace('.', '')
      const newDigits = digits + key
      return (parseInt(newDigits) / 100).toFixed(2)
    })
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">

      {/* Linker + rechter split */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Links: categorieën (leeg voor nu) ── */}
        <div className="flex-1 bg-gray-100 p-4 overflow-y-auto">
          <div className="h-full flex items-center justify-center text-gray-400">
          </div>
        </div>

        {/* ── Rechts: numpad paneel ── */}
        <div className="w-72 flex flex-col bg-white border-l border-gray-200 shadow-lg shrink-0">

          {/* Kies tafel */}
          <button className="mx-3 mt-3 py-3 bg-[#2AAB8C] hover:bg-[#229A7E] text-white font-bold rounded-lg text-sm transition-colors">
            Kies tafel...
          </button>

          {/* Hier opeten */}
          <button className="mx-3 mt-2 py-3 bg-[#2AAB8C] hover:bg-[#229A7E] text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            🌍 HIER OPETEN
          </button>

          {/* Display */}
          <div className="mx-3 mt-3 bg-white border border-gray-200 rounded-lg px-4 py-3 text-right">
            <span className="text-2xl font-bold text-gray-800">{display}</span>
          </div>

          {/* Numpad */}
          <div className="mx-3 mt-2 grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <button onClick={() => handleNumpad('7')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">7</button>
            <button onClick={() => handleNumpad('8')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">8</button>
            <button onClick={() => handleNumpad('9')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">9</button>
            <button className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-lg font-bold text-white text-lg transition-colors">+</button>

            {/* Row 2 */}
            <button onClick={() => handleNumpad('4')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">4</button>
            <button onClick={() => handleNumpad('5')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">5</button>
            <button onClick={() => handleNumpad('6')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">6</button>
            <button className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-lg font-bold text-white text-lg transition-colors">-</button>

            {/* Row 3 */}
            <button onClick={() => handleNumpad('1')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">1</button>
            <button onClick={() => handleNumpad('2')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">2</button>
            <button onClick={() => handleNumpad('3')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">3</button>
            <button className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-lg font-bold text-white text-lg transition-colors">×</button>

            {/* Row 4 */}
            <button onClick={() => handleNumpad('C')} className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-lg font-bold text-white text-lg transition-colors">C</button>
            <button onClick={() => handleNumpad('0')} className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">0</button>
            <button className="py-4 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">.</button>
            <button className="py-4 bg-[#22c55e] hover:bg-[#16a34a] rounded-lg font-bold text-white text-lg transition-colors">=</button>
          </div>

          {/* Totaal */}
          <div className="mx-3 mt-3 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="font-bold text-gray-700">Totaal</span>
            <span className="font-bold text-gray-800 text-lg">€0.00</span>
          </div>

          {/* Actie knoppen */}
          <div className="mx-3 mt-2 grid grid-cols-3 gap-1.5">
            <button className="flex flex-col items-center gap-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="text-xs font-semibold">Lade open</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="text-xs font-semibold">Print opnieuw</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-xs font-semibold">Verwijder</span>
            </button>
          </div>

          {/* Afrekenen */}
          <button className="mx-3 mt-2 mb-3 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Afrekenen
          </button>
        </div>
      </div>
    </div>
  )
}
