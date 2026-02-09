'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface GroupInfo {
  id: string
  name: string
  tenant_slug: string
  group_type: string
  allow_individual_payment: boolean
  company_pays: boolean
}

interface Session {
  id: string
  title: string | null
  description: string | null
  order_deadline: string
  delivery_time: string | null
  status: string
}

interface Member {
  id: string
  name: string
  email: string | null
  department: string | null
}

export default function GroupJoinPage({ params }: { params: { tenant: string; code: string } }) {
  const [step, setStep] = useState<'join' | 'sessions' | 'order'>('join')
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Join form
  const [joinForm, setJoinForm] = useState({
    name: '',
    email: '',
    department: ''
  })
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    checkExistingMember()
  }, [params.code])

  async function checkExistingMember() {
    setLoading(true)
    
    // Check localStorage for existing member
    const stored = localStorage.getItem(`group_member_${params.code}`)
    if (stored) {
      try {
        const memberData = JSON.parse(stored)
        setMember(memberData.member)
        setGroup(memberData.group)
        await loadSessions(memberData.group.id)
        setStep('sessions')
      } catch {
        localStorage.removeItem(`group_member_${params.code}`)
      }
    }
    
    setLoading(false)
  }

  async function loadSessions(groupId: string) {
    const res = await fetch(`/api/groups/sessions?group_id=${groupId}`)
    if (res.ok) {
      const data = await res.json()
      // Only show open sessions
      setSessions(data.filter((s: Session) => s.status === 'open'))
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoining(true)
    setError(null)

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: params.code,
          ...joinForm
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Kon niet deelnemen')
      }

      // Store member info
      localStorage.setItem(`group_member_${params.code}`, JSON.stringify(data))
      
      setMember(data.member)
      setGroup(data.group)
      await loadSessions(data.group.id)
      setStep('sessions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis')
    }

    setJoining(false)
  }

  function formatDeadline(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (diff < 0) return 'Verlopen'
    if (hours < 24) return `Nog ${hours}u ${minutes}m`
    return date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function isDeadlineSoon(dateStr: string) {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return diff < 2 * 60 * 60 * 1000 // Less than 2 hours
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="text-5xl mb-4 block">👥</span>
          <h1 className="text-2xl font-bold text-gray-900">
            {group ? group.name : 'Groepsbestelling'}
          </h1>
          {member && (
            <p className="text-gray-600 mt-1">Welkom, {member.name}!</p>
          )}
        </motion.div>

        {/* Step: Join */}
        {step === 'join' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Registreer om te bestellen</h2>
            
            {error && (
              <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Je naam *</label>
                <input
                  type="text"
                  value={joinForm.name}
                  onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
                  required
                  placeholder="Volledige naam"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={joinForm.email}
                  onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
                  placeholder="naam@bedrijf.nl"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Afdeling</label>
                <input
                  type="text"
                  value={joinForm.department}
                  onChange={(e) => setJoinForm({ ...joinForm, department: e.target.value })}
                  placeholder="bijv. Marketing, IT, ..."
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={joining}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {joining ? 'Even geduld...' : 'Deelnemen'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Step: Sessions */}
        {step === 'sessions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <span className="text-4xl mb-4 block">📭</span>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Geen actieve bestelmomenten</h2>
                <p className="text-gray-600">Er zijn momenteel geen open bestellingen voor je groep.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Kies een bestelmoment</h2>
                
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSession(session)}
                    className="bg-white rounded-2xl p-4 shadow-lg cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {session.title || 'Bestelling'}
                        </h3>
                        {session.description && (
                          <p className="text-sm text-gray-500">{session.description}</p>
                        )}
                      </div>
                      <div className={`text-right ${isDeadlineSoon(session.order_deadline) ? 'text-red-600' : 'text-gray-600'}`}>
                        <div className="text-sm">Deadline</div>
                        <div className="font-bold">{formatDeadline(session.order_deadline)}</div>
                      </div>
                    </div>
                    
                    {session.delivery_time && (
                      <div className="mt-2 pt-2 border-t text-sm text-gray-500">
                        🚗 Levering: {new Date(session.delivery_time).toLocaleString('nl-NL', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Quick link to menu if session selected */}
            {selectedSession && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4"
              >
                <p className="text-green-800 mb-3">
                  Je hebt gekozen: <strong>{selectedSession.title || 'Bestelling'}</strong>
                </p>
                <Link
                  href={`/shop/${params.tenant}/menu?group_session=${selectedSession.id}&member_id=${member?.id}&member_name=${encodeURIComponent(member?.name || '')}`}
                  className="block w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-center"
                >
                  🍽️ Ga naar menu &amp; bestel
                </Link>
              </motion.div>
            )}

            {/* Switch user */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  localStorage.removeItem(`group_member_${params.code}`)
                  setMember(null)
                  setGroup(null)
                  setStep('join')
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Niet {member?.name}? Klik hier om te wisselen
              </button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Powered by <Link href="https://vysionhoreca.com" className="text-blue-500 hover:underline">Vysion</Link>
        </div>
      </div>
    </div>
  )
}
