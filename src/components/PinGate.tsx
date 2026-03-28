'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useLanguage } from '@/i18n'

interface Props {
  tenant: string
  children: ReactNode
}

type State = 'loading' | 'no-pin' | 'locked' | 'unlocked' | 'forgot'

export default function PinGate({ tenant, children }: Props) {
  const { t } = useLanguage()
  const SESSION_KEY = `vysion_pin_unlocked_${tenant}`
  const [state, setState] = useState<State>('loading')
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
      setError(t('pinGate.incorrectPin'))
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
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setError(t('pinGate.invalidPin')); return }
    if (newPin !== confirmPin) { setError(t('pinGate.pinMismatch')); return }
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
      setError(data.error || t('pinGate.emailMismatch'))
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

  if (state === 'unlocked') return <>{children}</>

  if (state === 'no-pin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">{t('pinGate.noAccessTitle')}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t('pinGate.noAccessBody1')}
            <br /><br />
            {t('pinGate.noAccessBody2')}{' '}
            <a href={`/shop/${tenant}/admin/pincode`} className="text-orange-500 font-semibold underline">
              {t('pinGate.kassaPinLink')}
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
            className="text-gray-400 hover:text-gray-600 text-sm mb-4">{t('pinGate.back')}</button>
          <div className="text-4xl mb-3 text-center">🔑</div>
          <h2 className="text-xl font-bold text-center mb-6">{t('pinGate.forgotTitle')}</h2>

          {forgotStep === 'email' ? (
            <>
              <p className="text-gray-500 text-sm mb-4 text-center">{t('pinGate.forgotEmailHelp')}</p>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder={t('ui.ownerEmailPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center mb-4"
              />
              <button onClick={handleForgotEmail} disabled={!forgotEmail || saving}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50">
                {t('pinGate.confirm')}
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4 text-center">{t('pinGate.newPinHelp')}</p>
              <input type="password" inputMode="numeric" maxLength={4} value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={t('ui.newPinPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center text-2xl tracking-widest mb-3" />
              <input type="password" inputMode="numeric" maxLength={4} value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={t('ui.confirmPinPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 outline-none text-center text-2xl tracking-widest mb-4" />
              {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
              <button onClick={handleSaveNewPin} disabled={saving}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50">
                {saving ? t('pinGate.saving') : t('pinGate.saveNewPin')}
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
        <h2 className="text-xl font-bold mb-1">{t('pinGate.ownerPinTitle')}</h2>
        <p className="text-gray-500 text-sm mb-6">{t('pinGate.enterPinHelp')}</p>

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
          {t('pinGate.forgotLink')}
        </button>
      </div>
    </div>
  )
}
