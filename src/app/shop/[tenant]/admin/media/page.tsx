'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface MediaItem {
  id: string
  url: string
  name: string
  size: number
  created_at: string
}

export default function MediaPage({ params }: { params: { tenant: string } }) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load media on mount
  useEffect(() => {
    loadMedia()
  }, [params.tenant])

  const loadMedia = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tenant_media')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setMedia(data)
    }
    setLoading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    for (const file of Array.from(files)) {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${params.tenant}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)

      // Save to database
      const { error: dbError } = await supabase
        .from('tenant_media')
        .insert({
          tenant_slug: params.tenant,
          url: urlData.publicUrl,
          name: file.name,
          size: file.size,
          type: 'image'
        })

      if (dbError) {
        console.error('DB error:', dbError)
      }
    }

    // Reload media
    await loadMedia()
    setUploading(false)
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const deleteSelected = async () => {
    if (!confirm(`${selectedItems.length} foto('s) verwijderen?`)) return

    for (const id of selectedItems) {
      const item = media.find(m => m.id === id)
      if (!item) continue

      // Delete from storage (extract path from URL)
      const urlParts = item.url.split('/media/')
      if (urlParts[1]) {
        await supabase.storage.from('media').remove([urlParts[1]])
      }

      // Delete from database
      await supabase.from('tenant_media').delete().eq('id', id)
    }

    setSelectedItems([])
    await loadMedia()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Vandaag'
    if (days === 1) return 'Gisteren'
    if (days < 7) return `${days} dagen geleden`
    if (days < 30) return `${Math.floor(days / 7)} weken geleden`
    return d.toLocaleDateString('nl-BE')
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium flex items-center gap-2"
          >
            {uploading ? '⏳ Uploaden...' : '📤 Uploaden'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => fileInputRef.current?.click()}
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

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">Laden...</p>
        </div>
      )}

      {/* Media Grid */}
      {!loading && viewMode === 'grid' && media.length > 0 && (
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
                <span className="text-3xl text-white">
                  {selectedItems.includes(item.id) ? '✓' : '○'}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{item.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Media List */}
      {!loading && viewMode === 'list' && media.length > 0 && (
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
                <p className="text-sm text-gray-500">{formatSize(item.size)}</p>
              </div>
              <p className="text-sm text-gray-400">{formatDate(item.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && media.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📷</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nog geen media</h3>
          <p className="text-gray-500">Upload je eerste foto&apos;s</p>
        </div>
      )}
    </div>
  )
}
