'use client'

import { useState, useEffect, ReactNode } from 'react'

interface Props {
  tenant: string
  children: ReactNode
}

type State = 'loading' | 'no-pin' | 'locked' | 'unlocked' | 'forgot'

export default function PinGate({ tenant, children }: Props) {
  const SESSION_KEY = `vysion_pin_unlocked_${tenant}`
  const [state, setState] = useState<State>('loading')
  const [showLockConfirm, setShowLockConfirm] = useState(false)

  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setState('locked')
    setShowLockConfirm(false)
    setPin('')
    setError('')
  }
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [forgotStep, setForgotStep] = useState<'email' | 'newpin'>('email')

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setState('unlocked')
      return
    }
    fetch(`/api/pin/check?tenant=${tenant}`)
      .then(r => r.json())
      .then(d => setState(d.hasPin ? 'locked' : 'no-pin'))
      .catch(() => setState('no-pin'))
  }, [tenant, SESSION_KEY])

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length === 4) verifyPin(next)
  }

  const verifyPin = async (code: string) => {
    const res = await fetch('/api/pin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, pin: code }),
    })
    const data = await res.json()
    if (data.valid) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setState('unlocked')
    } else {
      setError('Onjuiste PIN. Probeer opnieuw.')
      setPin('')
    }
  }

  const handleForgotEmail = async () => {
    if (!forgotEmail) return
    setSaving(true)
    // Stap 1: check of email klopt door meteen naar 'newpin' te gaan
    // De API verifieert het email bij het opslaan van het nieuwe PIN
    setForgotStep('newpin')
    setSaving(false)
  }

  const handleSaveNewPin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setError('Voer een geldig 4-cijferig PIN in'); return }
    if (newPin !== confirmPin) { setError('PIN codes komen niet overeen'); return }
    setSaving(true)
    const res = await fetch('/api/pin/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, pin: newPin, email: forgotEmail }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      setState('locked')
      setForgotStep('email')
      setForgotEmail('')
      setNewPin('')
      setConfirmPin('')
    } else {
      setError(data.error || 'E-mailadres komt niet overeen')
      setForgotStep('email')
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'unlocked') return (
    <>
      {/* Vergrendelknop — onder de header, niet overlappend */}
      <div className="fixed top-20 right-4 z-50">
        {showLockConfirm ? (
          <div className="bg-white rounded-2xl shadow-xl p-4 flex flex-col items-center gap-3 border border-gray-200 min-w-[180px]">
            <p className="text-sm font-semibold text-gray-700 text-center">Module vergrendelen?</p>
            <div className="flex gap-2 w-full">
              <button
                onClick={lock}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                Vergrendel
              </button>
              <button
                onClick={() => setShowLockConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition-colors"
              >
                Annuleer
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLockConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-300 text-sm font-semibold transition-colors"
          >
            <span>🔒</span> Vergrendel
          </button>
        )}
      </div>
      {children}
    </>
  )

  if (state === 'no-pin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Geen toegang</h2>
          <p className="text-gray-600 leading-relaxed">
            U heeft geen toegang tot deze module.
            <br /><br />
            Als u de eigenaar bent, maak dan eerst een pincode aan onder{' '}
            <a href={`/shop/${tenant}/admin/kassa`} className="text-orange-500 font-semibold underline">
              Kassa → Pincode
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (state === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <button onClick={() => { setState('locked'); setForgotStep('email'); setError(''); setNewPin(''); setConfirmPin(''); setForgotEmail('') }}
            className="text-gray-400 hover:text-gray-600 text-sm mb-4">← Terug</button>
          <div className="text-4xl mb-3 text-center">🔑</div>
          <h2 className="text-xl font-bold text-center mb-6">PIN vergeten</h2>

          {forgotStep === 'email' ? (
            <>
              <p className="text-gray-500 text-sm mb-4 text-center">Bevestig uw eigenaar e-mailadres</p>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="eigenaar@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center mb-4"
              />
              <button onClick={handleForgotEmail} disabled={!forgotEmail || saving}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50">
                Bevestigen
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4 text-center">Stel een nieuw 4-cijferig PIN in</p>
              <input type="password" inputMode="numeric" maxLength={4} value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Nieuw PIN"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center text-2xl tracking-widest mb-3" />
              <input type="password" inputMode="numeric" maxLength={4} value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Bevestig PIN"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center text-2xl tracking-widest mb-4" />
              {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
              <button onClick={handleSaveNewPin} disabled={saving}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50">
                {saving ? 'Opslaan...' : 'Nieuw PIN opslaan'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // state === 'locked'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-xs w-full text-center">
        <div className="text-4xl mb-2">🔐</div>
        <h2 className="text-xl font-bold mb-1">Eigenaar PIN</h2>
        <p className="text-gray-500 text-sm mb-6">Voer uw 4-cijferige PIN in</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${
              pin.length > i ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
            }`} />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <button key={i}
              onClick={() => {
                if (d === '⌫') { setPin(p => p.slice(0, -1)); setError('') }
                else if (d) handleDigit(d)
              }}
              disabled={!d && d !== '0'}
              className={`py-4 rounded-xl text-xl font-bold transition-colors ${
                d === '' ? 'invisible' :
                d === '⌫' ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' :
                'bg-gray-100 hover:bg-orange-100 hover:text-orange-600 active:scale-95'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <button onClick={() => { setState('forgot'); setError(''); setPin('') }}
          className="text-orange-500 text-sm underline hover:text-orange-700">
          PIN vergeten?
        </button>
      </div>
    </div>
  )
}
