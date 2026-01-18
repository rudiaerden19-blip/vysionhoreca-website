'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTeamMembers, saveTeamMember, deleteTeamMember, TeamMember } from '@/lib/admin-api'
import MediaPicker from '@/components/MediaPicker'

export default function TeamPage({ params }: { params: { tenant: string } }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    photo_url: '',
  })

  useEffect(() => {
    loadMembers()
  }, [params.tenant])

  async function loadMembers() {
    setLoading(true)
    const data = await getTeamMembers(params.tenant)
    setMembers(data)
    setLoading(false)
  }

  const handleAdd = () => {
    setEditingMember(null)
    setFormData({ name: '', role: '', photo_url: '' })
    setShowModal(true)
  }

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      role: member.role || '',
      photo_url: member.photo_url || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit teamlid wilt verwijderen?')) return
    
    const success = await deleteTeamMember(id)
    if (success) {
      setMembers(prev => prev.filter(m => m.id !== id))
    } else {
      alert('Verwijderen mislukt')
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Vul een naam in')
      return
    }

    setSaving(true)

    const memberData: TeamMember = {
      ...(editingMember?.id && { id: editingMember.id }),
      tenant_slug: params.tenant,
      name: formData.name,
      role: formData.role || undefined,
      photo_url: formData.photo_url || undefined,
      display_order: editingMember?.display_order || members.length,
    }

    const saved = await saveTeamMember(memberData)
    
    if (saved) {
      setShowModal(false)
      loadMembers()
    } else {
      alert('Opslaan mislukt')
    }
    
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ons Team</h1>
          <p className="text-gray-500">Toon je teamleden op de website</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          <span>+</span>
          <span>Teamlid toevoegen</span>
        </motion.button>
      </div>

      {/* Team Grid */}
      {members.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-12 text-center shadow-sm"
        >
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nog geen teamleden</h3>
          <p className="text-gray-500 mb-6">Voeg teamleden toe om ze op je website te tonen</p>
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium"
          >
            Eerste teamlid toevoegen
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm group relative"
            >
              {/* Photo */}
              <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden mb-4">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                    👤
                  </div>
                )}
              </div>

              {/* Info */}
              <h3 className="font-semibold text-gray-900 text-center">{member.name}</h3>
              {member.role && (
                <p className="text-sm text-gray-500 text-center">{member.role}</p>
              )}

              {/* Actions (hover) */}
              <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleEdit(member)}
                  className="p-3 bg-white rounded-xl hover:bg-gray-100 transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => member.id && handleDelete(member.id)}
                  className="p-3 bg-white rounded-xl hover:bg-red-100 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tip</h3>
        <p className="text-blue-700 text-sm">
          Teamleden worden automatisch getoond op je website in de &quot;Ons Team&quot; sectie tussen de topverkopers en openingsuren.
        </p>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingMember ? 'Teamlid bewerken' : 'Nieuw teamlid'}
              </h2>

              <div className="space-y-4">
                {/* Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Foto
                  </label>
                  <MediaPicker
                    tenantSlug={params.tenant}
                    value={formData.photo_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, photo_url: url }))}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naam *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Jan Jansen"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Functie
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Chef-kok, Eigenaar, Medewerker..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
