'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface MediaItem {
  id: string
  url: string
  type: 'image' | 'video'
  name: string
  size: string
  uploadedAt: string
}

export default function MediaPage({ params }: { params: { tenant: string } }) {
  const [media, setMedia] = useState<MediaItem[]>([
    { id: '1', url: 'https://images.unsplash.com/photo-1619881590738-a111d176d906?w=400', type: 'image', name: 'cover-1.jpg', size: '2.4 MB', uploadedAt: '2 dagen geleden' },
    { id: '2', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', type: 'image', name: 'friet.jpg', size: '1.8 MB', uploadedAt: '1 week geleden' },
    { id: '3', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', type: 'image', name: 'burger.jpg', size: '2.1 MB', uploadedAt: '1 week geleden' },
    { id: '4', url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400', type: 'image', name: 'snack.jpg', size: '1.5 MB', uploadedAt: '2 weken geleden' },
  ])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const deleteSelected = () => {
    if (confirm(`${selectedItems.length} item(s) verwijderen?`)) {
      setMedia(prev => prev.filter(m => !selectedItems.includes(m.id)))
      setSelectedItems([])
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Foto&apos;s & Media</h1>
          <p className="text-gray-500">{media.length} bestanden geüpload</p>
        </div>
        <div className="flex gap-3">
          {selectedItems.length > 0 && (
            <button
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-medium"
            >
              🗑️ {selectedItems.length} verwijderen
            </button>
          )}
          <button
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
          >
            📤 Uploaden
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center mb-8 hover:border-orange-500 transition-colors cursor-pointer bg-gray-50"
      >
        <span className="text-5xl mb-4 block">📷</span>
        <p className="text-gray-700 font-medium mb-2">Sleep bestanden hierheen</p>
        <p className="text-gray-500 text-sm mb-4">of klik om te uploaden</p>
        <p className="text-gray-400 text-xs">JPG, PNG, GIF tot 10MB</p>
      </motion.div>

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500">{media.length} bestanden</p>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
          >
            ⊞
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleSelect(item.id)}
              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group ${
                selectedItems.includes(item.id) ? 'ring-4 ring-orange-500' : ''
              }`}
            >
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
              <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                selectedItems.includes(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <span className="text-3xl">
                  {selectedItems.includes(item.id) ? '✓' : '○'}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{item.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {media.map((item) => (
            <div 
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={`flex items-center gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer ${
                selectedItems.includes(item.id) ? 'bg-orange-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500"
              />
              <img
                src={item.url}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">{item.size}</p>
              </div>
              <p className="text-sm text-gray-400">{item.uploadedAt}</p>
              <button className="p-2 hover:bg-gray-200 rounded-lg">⋯</button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {media.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📷</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nog geen media</h3>
          <p className="text-gray-500">Upload je eerste foto&apos;s</p>
        </div>
      )}
    </div>
  )
}
