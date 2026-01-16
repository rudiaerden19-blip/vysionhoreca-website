'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SuperAdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Simple password check (in production, use proper hashing)
      const { data, error: dbError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password_hash', password)
        .eq('is_active', true)
        .single()

      if (dbError || !data) {
        setError('Onjuiste email of wachtwoord')
        setLoading(false)
        return
      }

      // Update last login
      await supabase
        .from('super_admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)

      // Store session
      localStorage.setItem('superadmin_id', data.id)
      localStorage.setItem('superadmin_email', data.email)
      localStorage.setItem('superadmin_name', data.name)

      router.push('/superadmin')
    } catch (err) {
      setError('Er is iets misgegaan')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vysion Super Admin</h1>
          <p className="text-gray-500 mt-1">Platform beheer</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="admin@vysionhoreca.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Inloggen...' : 'Inloggen'}
          </motion.button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Alleen voor Vysion beheerders
        </p>
      </motion.div>
    </div>
  )
}
