'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Monitor, Printer, CheckCircle2, Copy, ArrowRight, Apple } from 'lucide-react'

/**
 * Kassa Registratie Pagina
 * 
 * APART van het bestelplatform registratie!
 * 
 * Flow:
 * 1. Klant vult formulier in
 * 2. Account wordt aangemaakt (tenant + business_profile)
 * 3. Install token wordt gegenereerd
 * 4. Klant krijgt instructies om VysionPrint app te downloaden
 * 5. Token invoeren in de app → kassa is klaar
 */

export default function KassaRegistrerenPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vatNumber: '', // BTW nummer (optioneel)
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
          product: 'KASSA', // Markeert dit als kassa-only registratie
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

  // Success state - toon instructies
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Success header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Account aangemaakt!</h1>
              <p className="text-gray-600 mt-2">Nog 2 stappen om je kassa te activeren</p>
            </div>

            {/* Step 1: Download app */}
            <div className="bg-slate-50 rounded-xl p-6 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Download VysionPrint</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Download de VysionPrint app op je iPad of iPhone
                  </p>
                  <a 
                    href="https://apps.apple.com/app/vysionprint" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    <Apple className="w-5 h-5" />
                    App Store
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2: Enter token */}
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Voer je activatiecode in</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Open de app en voer deze code in:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border-2 border-dashed border-orange-300 rounded-lg px-4 py-3 font-mono text-lg text-center break-all">
                      {installToken}
                    </code>
                    <button
                      onClick={copyToken}
                      className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                      title="Kopieer code"
                    >
                      {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Email notice */}
            <p className="text-sm text-gray-500 text-center mb-6">
              We hebben ook een email gestuurd naar <strong>{formData.email}</strong> met deze instructies.
            </p>

            {/* Support link */}
            <div className="text-center">
              <Link 
                href="/support" 
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Hulp nodig? Neem contact op
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* Left side - Info */}
        <div className="text-white">
          <h1 className="text-4xl font-bold mb-4">
            Vysion <span className="text-orange-500">Kassa</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Professioneel kassasysteem voor horeca. Start vandaag met 14 dagen gratis proberen.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold">Werkt op iPad & iPhone</h3>
                <p className="text-slate-400 text-sm">Download de VysionPrint app en je kassa is klaar</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold">Bonprinter support</h3>
                <p className="text-slate-400 text-sm">Automatische herkenning van je printer</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold">GKS-ready</h3>
                <p className="text-slate-400 text-sm">Klaar voor Belgische fiscale wetgeving</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-sm text-slate-400">
            Al een account? <Link href="/login" className="text-orange-400 hover:underline">Inloggen</Link>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Registreren</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrijfsnaam *
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="Jouw zaak"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="jouw@email.be"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefoonnummer *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="+32 ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BTW-nummer <span className="text-gray-400">(optioneel)</span>
              </label>
              <input
                type="text"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="BE0123456789"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wachtwoord *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="Min. 8 tekens"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bevestig *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="Herhaal"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Even geduld...</span>
              ) : (
                <>
                  <span>Gratis proberen</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Door te registreren ga je akkoord met onze{' '}
              <Link href="/juridisch" className="underline">voorwaarden</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
