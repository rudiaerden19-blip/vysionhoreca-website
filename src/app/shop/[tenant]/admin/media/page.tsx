'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

// =====================================================
// AUTOMATISCHE IMAGE RESIZE FUNCTIE
// Verkleint afbeeldingen naar max 800x800 en optimaliseert kwaliteit
// =====================================================
const MAX_IMAGE_SIZE = 800
const IMAGE_QUALITY = 0.85

async function resizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Alleen afbeeldingen resizen
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      let { width, height } = img

      // Bereken nieuwe dimensies (behoud aspect ratio)
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_SIZE) / width)
          width = MAX_IMAGE_SIZE
        } else {
          width = Math.round((width * MAX_IMAGE_SIZE) / height)
          height = MAX_IMAGE_SIZE
        }
      }

      canvas.width = width
      canvas.height = height

      // Teken afbeelding op canvas met witte achtergrond
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
      }

      // Converteer naar blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Maak nieuwe File met dezelfde naam maar .jpg extensie
            const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            const resizedFile = new File([blob], newFileName, { type: 'image/jpeg' })
            resolve(resizedFile)
          } else {
            resolve(file) // Fallback naar origineel
          }
        },
        'image/jpeg',
        IMAGE_QUALITY
      )
    }

    img.onerror = () => {
      console.error('Fout bij laden afbeelding voor resize')
      resolve(file) // Fallback naar origineel
    }

    // Laad afbeelding van file
    img.src = URL.createObjectURL(file)
  })
}

interface MediaItem {
  id: string
  url: string
  file_url?: string  // Database kolom naam
  name: string
  file_name?: string // Database kolom naam
  size: number
  category: string
  created_at: string
}

export default function MediaPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [media, setMedia] = useState<MediaItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('alle')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
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
      // Map voor backwards compatibility met verschillende kolom namen
      const mappedData = data.map(item => ({
        ...item,
        url: item.url || item.file_url || '',  // Ondersteun beide kolom namen
        name: item.name || item.file_name || 'Foto'
      }))
      setMedia(mappedData)
      // Extract unique categories
      const cats = [...new Set(data.map(m => m.category).filter(c => c && c.trim() !== ''))]
      setCategories(cats)
    }
    setLoading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    let successCount = 0
    let errorMessage = ''

    for (const originalFile of Array.from(files)) {
      // Resize afbeelding naar max 800x800 pixels
      const file = await resizeImage(originalFile)
      
      const fileName = `${params.tenant}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          contentType: 'image/jpeg',
          cacheControl: '31536000' // 1 jaar cache
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        errorMessage = uploadError.message
        continue
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)

      // Gestandaardiseerd schema: beide kolommen aanwezig
      const { error: dbError } = await supabase
        .from('tenant_media')
        .insert({
          tenant_slug: params.tenant,
          file_url: urlData.publicUrl,
          url: urlData.publicUrl,
          file_name: originalFile.name,  // Originele bestandsnaam
          name: originalFile.name.replace(/\.[^/.]+$/, ''),  // Naam zonder extensie
          size: file.size,  // Geoptimaliseerde grootte
          type: 'image',
          category: uploadCategory || ''
        })

      if (dbError) {
        console.error('DB error:', dbError)
        errorMessage = dbError.message
      } else {
        successCount++
      }
    }

    await loadMedia()
    setUploading(false)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (successCount > 0) {
      alert(`✅ ${successCount} foto('s) geüpload en geoptimaliseerd!`)
    } else if (errorMessage) {
      alert(`❌ Upload mislukt: ${errorMessage}`)
    }
  }

  const createCategory = () => {
    if (newCategoryName.trim()) {
      setCategories(prev => [...prev, newCategoryName.trim()])
      setUploadCategory(newCategoryName.trim())
      setNewCategoryName('')
      setShowNewCategory(false)
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

      const urlParts = item.url.split('/media/')
      if (urlParts[1]) {
        await supabase.storage.from('media').remove([urlParts[1]])
      }
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
    return d.toLocaleDateString('nl-BE')
  }

  // Filter media by category
  const filteredMedia = selectedCategory === 'alle' 
    ? media 
    : media.filter(m => m.category === selectedCategory)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('websiteMedia.title')}</h1>
          <p className="text-gray-500">{media.length} {t('websiteMedia.filesUploaded')}</p>
        </div>
        <div className="flex gap-3">
          {selectedItems.length > 0 && (
            <button
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-medium"
            >
              🗑️ {selectedItems.length} {t('websiteMedia.delete')}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium flex items-center gap-2"
          >
            {uploading ? `⏳ ${t('websiteMedia.optimizing')}` : `📤 ${t('websiteMedia.upload')}`}
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

      {/* Category Selector for Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm mb-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4">📁 {t('websiteMedia.uploadToFolder')}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setUploadCategory('')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              uploadCategory === '' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {t('websiteMedia.noFolder')}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setUploadCategory(cat)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                uploadCategory === cat 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              📁 {cat}
            </button>
          ))}
          <button
            onClick={() => setShowNewCategory(true)}
            className="px-4 py-2 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            + {t('websiteMedia.newFolder')}
          </button>
        </div>

        {/* New Category Input */}
        <AnimatePresence>
          {showNewCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex gap-2"
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('websiteMedia.folderNamePlaceholder')}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={createCategory}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowNewCategory(false)
                  setNewCategoryName('')
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center mb-8 hover:border-orange-500 transition-colors cursor-pointer bg-gray-50"
      >
        <span className="text-5xl mb-4 block">📷</span>
        <p className="text-gray-700 font-medium mb-2">{t('websiteMedia.dragFilesHere')}</p>
        <p className="text-gray-500 text-sm mb-4">{t('websiteMedia.orClickToUpload')}</p>
        <p className="text-gray-400 text-xs">{t('websiteMedia.supportedFormats')}</p>
        {uploadCategory && (
          <p className="text-orange-500 text-sm mt-2">→ {t('websiteMedia.uploadingTo')}: <strong>{uploadCategory}</strong></p>
        )}
      </motion.div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-4 mb-6">
          <span className="text-gray-500 text-sm">{t('websiteMedia.filter')}:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('alle')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === 'alle' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {t('websiteMedia.all')} ({media.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {cat} ({media.filter(m => m.category === cat).length})
              </button>
            ))}
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === '' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {t('websiteMedia.withoutFolder')} ({media.filter(m => !m.category || m.category === '').length})
            </button>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500">{filteredMedia.length} {t('websiteMedia.files')}</p>
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
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      )}

      {/* Media Grid */}
      {!loading && viewMode === 'grid' && filteredMedia.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMedia.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => toggleSelect(item.id)}
              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 ${
                selectedItems.includes(item.id) ? 'ring-4 ring-orange-500' : ''
              }`}
            >
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                selectedItems.includes(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <span className="text-3xl text-white">
                  {selectedItems.includes(item.id) ? '✓' : '○'}
                </span>
              </div>
              {item.category && (
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                  📁 {item.category}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{item.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Media List */}
      {!loading && viewMode === 'list' && filteredMedia.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filteredMedia.map((item) => (
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
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-sm text-gray-500">{formatSize(item.size)}</p>
              </div>
              {item.category && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                  📁 {item.category}
                </span>
              )}
              <p className="text-sm text-gray-400">{formatDate(item.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMedia.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📷</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {selectedCategory === 'alle' ? t('websiteMedia.noMedia') : `${t('websiteMedia.noPhotosIn')} "${selectedCategory}"`}
          </h3>
          <p className="text-gray-500">{t('websiteMedia.uploadFirstPhotos')}</p>
        </div>
      )}
    </div>
  )
}
