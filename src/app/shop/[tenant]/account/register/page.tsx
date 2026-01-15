'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getTenantSettings, registerCustomer, TenantSettings } from '@/lib/admin-api'

export default function RegisterPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  const primaryColor = tenantSettings?.primary_color || '#FF6B35'

  useEffect(() => {
    loadData()
  }, [params.tenant])

  async function loadData() {
    // Check if already logged in
    const customerId = localStorage.getItem(`customer_${params.tenant}`)
    if (customerId) {
      router.push(`/shop/${params.tenant}/account`)
      return
    }

    const settings = await getTenantSettings(params.tenant)
    setTenantSettings(settings)
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Wachtwoorden komen niet overeen')
      return
    }

    setSubmitting(true)

    const result = await registerCustomer(
      params.tenant,
      formData.email,
      formData.password,
      formData.name,
      formData.phone || undefined
    )
    
    if (result.success && result.customer) {
      localStorage.setItem(`customer_${params.tenant}`, result.customer.id!)
      router.push(`/shop/${params.tenant}/account`)
    } else {
      setError(result.error || 'Registratie mislukt')
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          className="w-12 h-12 border-4 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Link href={`/shop/${params.tenant}`} className="inline-block mb-4">
            <span className="text-4xl">🎉</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Account aanmaken</h1>
          <p className="text-gray-500 mt-1">Registreer bij {tenantSettings?.business_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
              placeholder="Je volledige naam"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
              placeholder="je@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
              placeholder="+32 ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
              placeholder="Minimaal 6 tekens"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bevestig wachtwoord *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
              placeholder="Herhaal wachtwoord"
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={submitting}
            style={{ backgroundColor: primaryColor }}
            className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Account aanmaken...</span>
              </>
            ) : (
              <span>Account aanmaken</span>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500">
            Al een account?{' '}
            <Link
              href={`/shop/${params.tenant}/account/login`}
              style={{ color: primaryColor }}
              className="font-medium hover:underline"
            >
              Inloggen
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href={`/shop/${params.tenant}`}
            className="text-gray-400 text-sm hover:text-gray-600"
          >
            ← Terug naar winkel
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Door te registreren ga je akkoord met de voorwaarden en privacybeleid.
        </p>
      </motion.div>
    </div>
  )
}
