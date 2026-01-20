'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getTenantSettings, registerCustomer, TenantSettings } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

export default function RegisterPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')

  const primaryColor = tenantSettings?.primary_color || '#FF6B35'

  useEffect(() => {
    loadData()
  }, [params.tenant])

  async function loadData() {
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
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    setGeneralError('')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('accountPage.nameRequired')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('accountPage.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('accountPage.invalidEmail')
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('accountPage.phoneRequired')
    }

    if (!formData.address.trim()) {
      newErrors.address = t('accountPage.addressRequired')
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = t('accountPage.postalCodeRequired')
    }

    if (!formData.city.trim()) {
      newErrors.city = t('accountPage.cityRequired')
    }

    if (!formData.password) {
      newErrors.password = t('accountPage.passwordRequired')
    } else if (formData.password.length < 6) {
      newErrors.password = t('accountPage.passwordMin')
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('accountPage.confirmPasswordRequired')
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('accountPage.passwordsMismatch')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    const result = await registerCustomer(
      params.tenant,
      formData.email,
      formData.password,
      formData.name,
      formData.phone,
      formData.address,
      formData.postal_code,
      formData.city
    )
    
    if (result.success && result.customer) {
      localStorage.setItem(`customer_${params.tenant}`, result.customer.id!)
      router.push(`/shop/${params.tenant}/account`)
    } else {
      setGeneralError(result.error || t('accountPage.registrationFailed'))
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
    <div style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }} className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-lg max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Link href={`/shop/${params.tenant}`} className="inline-block mb-4">
            <span className="text-4xl">🎉</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('accountPage.createAccount')}</h1>
          <p className="text-gray-500 mt-1">{t('accountPage.joinLoyalty')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {generalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {generalError}
            </div>
          )}

          {/* Naam */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountPage.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder={t('accountPage.name')}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountPage.email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder={t('accountPage.email')}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Telefoon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountPage.phone')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder={t('accountPage.phone')}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Adres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountPage.address')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                errors.address ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder={t('accountPage.address')}
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          {/* Postcode & Stad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('accountPage.postalCode')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                  errors.postal_code ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
                placeholder={t('accountPage.postalCode')}
              />
              {errors.postal_code && <p className="text-red-500 text-xs mt-1">{errors.postal_code}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('accountPage.city')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                  errors.city ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
                placeholder={t('accountPage.city')}
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>
          </div>

          {/* Wachtwoord */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountPage.password')} <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                errors.password ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder={t('accountPage.passwordMin')}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Bevestig wachtwoord */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountPage.confirmPassword')} <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder={t('accountPage.confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <p className="text-xs text-gray-400">
            <span className="text-red-500">*</span> = verplicht veld
          </p>

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
                <span>{t('accountPage.registering')}</span>
              </>
            ) : (
              <span>{t('accountPage.createAccount')}</span>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500">
            {t('accountPage.alreadyAccount')}{' '}
            <Link
              href={`/shop/${params.tenant}/account/login`}
              style={{ color: primaryColor }}
              className="font-medium hover:underline"
            >
              {t('accountPage.login')}
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href={`/shop/${params.tenant}`}
            className="text-gray-400 text-sm hover:text-gray-600"
          >
            ← {t('accountPage.backToShop')}
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Door te registreren ga je akkoord met de voorwaarden en privacybeleid.
        </p>
      </motion.div>
    </div>
  )
}
