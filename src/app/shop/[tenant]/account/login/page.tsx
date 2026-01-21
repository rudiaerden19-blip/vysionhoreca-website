'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getTenantSettings, loginCustomer, TenantSettings } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

export default function LoginPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const primaryColor = tenantSettings?.primary_color || '#FF6B35'

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await loginCustomer(params.tenant, email, password)
    
    if (result.success && result.customer) {
      localStorage.setItem(`customer_${params.tenant}`, result.customer.id!)
      router.push(`/shop/${params.tenant}/account`)
    } else {
      setError(result.error || t('accountPage.loginFailed'))
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
            <span className="text-4xl">👤</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('accountPage.login')}</h1>
          <p className="text-gray-500 mt-1">{t('accountPage.loginAt')} {tenantSettings?.business_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('accountPage.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
              placeholder={t('accountPage.email')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('accountPage.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
              placeholder="••••••••"
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
                <span>{t('accountPage.loggingIn')}</span>
              </>
            ) : (
              <span>{t('accountPage.login')}</span>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500">
            {t('accountPage.noAccount')}{' '}
            <Link
              href={`/shop/${params.tenant}/account/register`}
              style={{ color: primaryColor }}
              className="font-medium hover:underline"
            >
              {t('accountPage.register')}
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
      </motion.div>
    </div>
  )
}
