'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const errorMessages: Record<string, string> = {
    missing_token: 'Geen verificatie token gevonden.',
    invalid_token: 'Ongeldige verificatie link.',
    expired_token: 'De verificatie link is verlopen. Vraag een nieuwe aan.',
    update_failed: 'Er ging iets mis bij het verifiëren. Probeer opnieuw.',
    server_error: 'Server fout. Probeer het later opnieuw.',
  }

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsResending(true)
    setResendMessage('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      setResendMessage(data.message || data.error)
    } catch {
      setResendMessage('Kon geen verbinding maken met de server.')
    }

    setIsResending(false)
  }

  // Success state
  if (success === 'true') {
    return (
      <main className="min-h-screen bg-dark flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <Link href="/">
              <span className="text-3xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </Link>
          </div>

          <div className="p-8 bg-green-500/10 border border-green-500/30 rounded-xl">
            <svg className="w-20 h-20 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-white mb-4">Email geverifieerd!</h1>
            <p className="text-gray-300 mb-8">
              Je emailadres is succesvol bevestigd. Je kunt nu inloggen en aan de slag.
            </p>
            <Link
              href="/login"
              className="inline-block bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
            >
              Inloggen →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-dark flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <Link href="/">
              <span className="text-3xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </Link>
          </div>

          <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-xl mb-8">
            <svg className="w-20 h-20 text-red-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold text-white mb-4">Verificatie mislukt</h1>
            <p className="text-gray-300">
              {errorMessages[error] || 'Er is een fout opgetreden.'}
            </p>
          </div>

          {/* Resend form */}
          <div className="bg-white/5 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Nieuwe verificatie link aanvragen</h3>
            <form onSubmit={handleResend} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Je emailadres"
                className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              />
              <button
                type="submit"
                disabled={isResending || !email}
                className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isResending ? 'Verzenden...' : 'Nieuwe link versturen'}
              </button>
              {resendMessage && (
                <p className="text-sm text-gray-400">{resendMessage}</p>
              )}
            </form>
          </div>
        </div>
      </main>
    )
  }

  // Default state (no params)
  return (
    <main className="min-h-screen bg-dark flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <Link href="/">
            <span className="text-3xl font-bold">
              <span className="text-accent">Vysion</span>
              <span className="text-gray-400 font-normal ml-1">horeca</span>
            </span>
          </Link>
        </div>

        <div className="p-8 bg-white/5 border border-gray-700 rounded-xl">
          <svg className="w-20 h-20 text-accent mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-4">Bevestig je email</h1>
          <p className="text-gray-300 mb-6">
            We hebben een verificatie email gestuurd naar je inbox. 
            Klik op de link in de email om je account te activeren.
          </p>
          <p className="text-gray-500 text-sm">
            Check ook je spam folder als je de email niet ziet.
          </p>
        </div>

        {/* Resend form */}
        <div className="mt-8 bg-white/5 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Geen email ontvangen?</h3>
          <form onSubmit={handleResend} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Je emailadres"
              className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
            />
            <button
              type="submit"
              disabled={isResending || !email}
              className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {isResending ? 'Verzenden...' : 'Opnieuw versturen'}
            </button>
            {resendMessage && (
              <p className="text-sm text-gray-400">{resendMessage}</p>
            )}
          </form>
        </div>

        <div className="mt-8">
          <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
            ← Terug naar inloggen
          </Link>
        </div>
      </div>
    </main>
  )
}

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin w-12 h-12 text-accent mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-400">Laden...</p>
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
