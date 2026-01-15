'use client'

import { useState } from 'react'
import { motion, Reorder } from 'framer-motion'

interface Category {
  id: string
  name: string
  productCount: number
  visible: boolean
}

export default function CategorieenPage({ params }: { params: { tenant: string } }) {
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Frieten', productCount: 8, visible: true },
    { id: '2', name: 'Snacks', productCount: 15, visible: true },
    { id: '3', name: 'Burgers', productCount: 6, visible: true },
    { id: '4', name: 'Sauzen', productCount: 12, visible: true },
    { id: '5', name: 'Dranken', productCount: 10, visible: true },
    { id: '6', name: 'Desserts', productCount: 4, visible: false },
  ])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleVisible = (id: string) => {
    setCategories(prev => prev.map(c => 
      c.id === id ? { ...c, visible: !c.visible } : c
    ))
  }

  const deleteCategory = (id: string) => {
    if (confirm('Weet je zeker dat je deze categorie wilt verwijderen?')) {
      setCategories(prev => prev.filter(c => c.id !== id))
    }
  }

  const addCategory = () => {
    if (newCategory.trim()) {
      setCategories(prev => [...prev, {
        id: Date.now().toString(),
        name: newCategory.trim(),
        productCount: 0,
        visible: true
      }])
      setNewCategory('')
    }
  }

  const updateName = (id: string, name: string) => {
    setCategories(prev => prev.map(c => 
      c.id === id ? { ...c, name } : c
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorieën</h1>
          <p className="text-gray-500">Beheer je menu categorieën</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          {saving ? '⏳' : '💾'} Opslaan
        </motion.button>
      </div>

      {/* Add New */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex gap-4">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nieuwe categorie naam..."
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
        />
        <button
          onClick={addCategory}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium"
        >
          + Toevoegen
        </button>
      </div>

      {/* Categories List */}
      <motion.div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <p className="text-sm text-gray-500">💡 Sleep om de volgorde te wijzigen</p>
        </div>
        <Reorder.Group values={categories} onReorder={setCategories} className="divide-y">
          {categories.map((category) => (
            <Reorder.Item key={category.id} value={category} className="p-4 bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">⋮⋮</span>
                
                {editingId === category.id ? (
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateName(category.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                    autoFocus
                    className="flex-1 px-3 py-2 border border-orange-500 rounded-lg focus:outline-none"
                  />
                ) : (
                  <span 
                    className="flex-1 font-medium text-gray-900 cursor-pointer hover:text-orange-500"
                    onClick={() => setEditingId(category.id)}
                  >
                    {category.name}
                  </span>
                )}

                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {category.productCount} producten
                </span>

                <button
                  onClick={() => toggleVisible(category.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    category.visible 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  title={category.visible ? 'Zichtbaar' : 'Verborgen'}
                >
                  {category.visible ? '👁️' : '🙈'}
                </button>

                <button
                  onClick={() => deleteCategory(category.id)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </motion.div>
    </div>
  )
}
