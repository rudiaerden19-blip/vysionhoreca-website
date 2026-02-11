'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Kassa Registratie Pagina
 * 
 * APART van het bestelplatform registratie!
 */

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/vysionprint'

export default function KassaRegistrerenPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vatNumber: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [installToken, setInstallToken] = useState('')
  const [copied, setCopied] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateForm = (): boolean => {
    if (!formData.businessName.trim()) {
      setError('Bedrijfsnaam is verplicht')
      return false
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Geldig email adres is verplicht')
      return false
    }
    if (!formData.phone.trim()) {
      setError('Telefoonnummer is verplicht')
      return false
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Wachtwoorden komen niet overeen')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/kassa/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: formData.businessName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          vatNumber: formData.vatNumber.trim() || null,
          product: 'KASSA',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registratie mislukt')
      }

      setInstallToken(data.installToken)
      setSuccess(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToken = () => {
    navigator.clipboard.writeText(installToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Success state
  if (success) {
    return (
      <main className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Success header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Account aangemaakt!</h1>
              <p className="text-gray-600 mt-2">Nog 2 stappen om je kassa te activeren</p>
            </div>

            {/* Step 1: Download app */}
            <div className="bg-gray-50 rounded-xl p-6 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Download VysionPrint</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Download de VysionPrint app op je iPad of iPhone
                  </p>
                  <a 
                    href={TESTFLIGHT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    App Store
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2: Enter token */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Voer je activatiecode in</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Open de app en voer deze code in:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border-2 border-dashed border-accent/50 rounded-lg px-4 py-3 font-mono text-sm text-center break-all">
                      {installToken}
                    </code>
                    <button
                      onClick={copyToken}
                      className="p-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition"
                      title="Kopieer code"
                    >
                      {copied ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Email notice */}
            <p className="text-sm text-gray-500 text-center mb-6">
              We hebben ook een email gestuurd naar <strong>{formData.email}</strong>
            </p>

            {/* Support link */}
            <div className="text-center">
              <Link href="/support" className="text-accent hover:underline font-medium">
                Hulp nodig? Neem contact op
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Registration form
  return (
    <main className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug naar home
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
                <span className="text-gray-400 font-normal ml-1">Kassa</span>
              </span>
            </Link>
            <p className="text-gray-400 mt-3">Registreer voor de kassa</p>
            <p className="text-gray-500 text-sm mt-1">14 dagen gratis proberen</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bedrijfsnaam *
              </label>
              <input
                name="businessName"
                type="text"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-xl text-white focus:border-accent focus:ring-1 focus:ring-accent transition"
                placeholder="Jouw zaak"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-xl text-white focus:border-accent focus:ring-1 focus:ring-accent transition"
                placeholder="jouw@email.be"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Telefoonnummer *
              </label>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-xl text-white focus:border-accent focus:ring-1 focus:ring-accent transition"
                placeholder="+32 ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                BTW-nummer <span className="text-gray-500">(optioneel)</span>
              </label>
              <input
                name="vatNumber"
                type="text"
                value={formData.vatNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-xl text-white focus:border-accent focus:ring-1 focus:ring-accent transition"
                placeholder="BE0123456789"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wachtwoord *
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-xl text-white focus:border-accent focus:ring-1 focus:ring-accent transition"
                  placeholder="Min. 8 tekens"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bevestig *
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-xl text-white focus:border-accent focus:ring-1 focus:ring-accent transition"
                  placeholder="Herhaal"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Even geduld...' : 'Gratis proberen →'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Door te registreren ga je akkoord met onze{' '}
              <Link href="/juridisch" className="underline hover:text-gray-400">voorwaarden</Link>
            </p>
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            Al een account?{' '}
            <Link href="/login" className="text-accent hover:underline">Inloggen</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
