'use client'

import { useState, useEffect } from 'react'

export default function PincodePage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const SESSION_KEY = `vysion_pin_unlocked_${tenant}`

  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [step, setStep] = useState<'check' | 'set' | 'change-current' | 'change-new'>('check')
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch(`/api/pin/check?tenant=${tenant}`)
      .then(r => r.json())
      .then(d => { setHasPin(d.hasPin); setStep(d.hasPin ? 'change-current' : 'set') })
  }, [tenant])

  const savePin = async (pin: string, opts: { currentPin?: string } = {}) => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/pin/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, pin, currentPin: opts.currentPin }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setSuccess(hasPin ? 'PIN succesvol gewijzigd!' : 'PIN succesvol ingesteld!')
      setHasPin(true)
      setPin1(''); setPin2(''); setCurrentPin('')
      setStep('change-current')
    } else {
      setError(data.error || 'Er ging iets mis')
    }
  }

  const handleSet = async () => {
    if (pin1.length !== 4) { setError('Voer 4 cijfers in'); return }
    if (pin1 !== pin2) { setError('PIN codes komen niet overeen'); return }
    await savePin(pin1)
  }

  const handleChange = async () => {
    if (currentPin.length !== 4) { setError('Voer uw huidig PIN in'); return }
    if (pin1.length !== 4) { setError('Voer een nieuw PIN in'); return }
    if (pin1 !== pin2) { setError('Nieuwe PIN codes komen niet overeen'); return }
    await savePin(pin1, { currentPin })
  }

  if (hasPin === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800">
            {hasPin ? 'PIN wijzigen' : 'PIN instellen'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {hasPin
              ? 'Voer uw huidig PIN in en stel een nieuw PIN in'
              : 'Stel een 4-cijferige eigenaar PIN in voor beveiligde modules'}
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-green-700 text-sm text-center font-semibold">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {hasPin && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Huidig PIN</label>
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={currentPin}
                onChange={e => { setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); setSuccess('') }}
                placeholder="• • • •"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center text-2xl tracking-widest"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              {hasPin ? 'Nieuw PIN' : 'PIN (4 cijfers)'}
            </label>
            <input
              type="password" inputMode="numeric" maxLength={4}
              value={pin1}
              onChange={e => { setPin1(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); setSuccess('') }}
              placeholder="• • • •"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center text-2xl tracking-widest"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              {hasPin ? 'Bevestig nieuw PIN' : 'Bevestig PIN'}
            </label>
            <input
              type="password" inputMode="numeric" maxLength={4}
              value={pin2}
              onChange={e => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); setSuccess('') }}
              placeholder="• • • •"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center text-2xl tracking-widest"
            />
          </div>

          <button
            onClick={hasPin ? handleChange : handleSet}
            disabled={saving}
            className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : hasPin ? 'PIN wijzigen' : 'PIN instellen'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
          <p className="font-semibold mb-1">Beschermde modules:</p>
          <p>Categorieën · Producten · Openingstijden · Abonnement · Betaalmethodes · Personeel · Rapporten · Z-rapport</p>
        </div>
      </div>
    </div>
  )
}
