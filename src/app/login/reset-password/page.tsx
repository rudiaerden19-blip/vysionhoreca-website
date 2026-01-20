'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Validate token on page load
    const validateToken = async () => {
      if (!token) {
        setTokenError('Geen reset token gevonden. Vraag een nieuwe reset link aan.')
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await response.json()

        if (!data.valid) {
          setTokenError(data.error || 'Ongeldige of verlopen reset link')
        }
      } catch {
        setTokenError('Kon token niet valideren')
      }

      setIsValidating(false)
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen')
      return
    }
    
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Er is een fout opgetreden')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Kon geen verbinding maken met de server')
    }
    
    setIsLoading(false)
  }

  // Loading state
  if (isValidating) {
    return (
      <main className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-12 h-12 text-accent mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400">Reset link controleren...</p>
        </div>
      </main>
    )
  }

  // Token error state
  if (tokenError) {
    return (
      <main className="min-h-screen bg-dark flex flex-col">
        <header className="p-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug naar inloggen
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <Link href="/">
                <span className="text-3xl font-bold">
                  <span className="text-accent">Vysion</span>
                  <span className="text-gray-400 font-normal ml-1">horeca</span>
                </span>
              </Link>
            </div>

            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">Link ongeldig</h3>
              <p className="text-gray-300 mb-6">{tokenError}</p>
              <Link
                href="/login/forgot-password"
                className="inline-block bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Nieuwe reset link aanvragen
              </Link>
            </div>
          </div>
        </div>

        <footer className="p-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
        </footer>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug naar inloggen
        </Link>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <Link href="/">
              <span className="text-3xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </Link>
            <p className="text-gray-400 mt-3">Nieuw wachtwoord instellen</p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">Wachtwoord gewijzigd!</h3>
                <p className="text-gray-300">
                  Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord.
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-lg font-semibold transition-colors text-center"
              >
                Naar inloggen →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Nieuw wachtwoord
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimaal 8 tekens"
                  className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Bevestig wachtwoord
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Herhaal je wachtwoord"
                  className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Opslaan...
                  </>
                ) : (
                  'Wachtwoord opslaan →'
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
      </footer>
    </main>
  )
}

// Loading fallback
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

// Main export with Suspense wrapper
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
