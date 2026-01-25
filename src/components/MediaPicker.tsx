'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

interface MediaItem {
  id: string
  url: string
  file_url?: string
  name: string
  file_name?: string
  category: string
}

interface MediaPickerProps {
  tenantSlug: string
  value?: string
  onChange: (url: string) => void
  label?: string
}

export default function MediaPicker({ tenantSlug, value, onChange, label }: MediaPickerProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('alle')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const loadMedia = useCallback(async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('tenant_media')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setMedia(data.map(item => ({
        id: item.id,
        url: item.url || item.file_url || '',
        name: item.name || item.file_name || 'Foto',
        category: item.category || ''
      })))
      const cats = [...new Set(data.map(m => m.category).filter(c => c && c.trim() !== ''))]
      setCategories(cats)
    }
    
    setLoading(false)
  }, [tenantSlug])

  useEffect(() => {
    if (isOpen) {
      loadMedia()
    }
  }, [isOpen, loadMedia])

  const handleUpload = async (file: File) => {
    if (!file || !supabase) return
    
    setUploading(true)
    setShowOptions(false)
    
    try {
      // Genereer unieke bestandsnaam
      const fileExt = file.name.split('.').pop()
      const fileName = `${tenantSlug}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      // Upload naar Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: false
        })
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Upload mislukt. Probeer opnieuw.')
        setUploading(false)
        return
      }
      
      // Haal publieke URL op
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)
      
      const publicUrl = urlData.publicUrl
      
      // Sla op in tenant_media tabel
      await supabase
        .from('tenant_media')
        .insert({
          tenant_slug: tenantSlug,
          url: publicUrl,
          file_url: publicUrl,
          name: file.name,
          file_name: file.name,
          category: 'Uploads',
          file_size: file.size,
          file_type: file.type
        })
      
      // Selecteer direct de geüploade foto
      onChange(publicUrl)
      
      // Herlaad media bibliotheek
      loadMedia()
      
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload mislukt. Probeer opnieuw.')
    }
    
    setUploading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset input
    e.target.value = ''
  }

  const selectImage = (url: string) => {
    onChange(url)
    setIsOpen(false)
  }

  const clearImage = () => {
    onChange('')
  }

  const filteredMedia = selectedCategory === 'alle' 
    ? media 
    : media.filter(m => m.category === selectedCategory)

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {/* Camera input - capture attribuut opent camera op mobiel/tablet */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* Current Image Preview */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <div 
            onClick={() => setShowOptions(!showOptions)}
            className={`relative w-32 h-32 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-gray-50 ${
              uploading ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
            }`}
          >
            {uploading ? (
              <div className="text-center p-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                />
                <span className="text-xs text-blue-600">Uploaden...</span>
              </div>
            ) : value ? (
              <Image src={value} alt="Selected" fill className="object-cover" unoptimized />
            ) : (
              <div className="text-center p-2">
                <span className="text-3xl block mb-1">📷</span>
                <span className="text-xs text-gray-500">{t('mediaPicker.choosePhoto') || 'Kies foto'}</span>
              </div>
            )}
          </div>
          
          {/* Options Dropdown */}
          <AnimatePresence>
            {showOptions && !uploading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border z-50 overflow-hidden min-w-[200px]"
              >
                {/* Upload from computer */}
                <button
                  onClick={() => {
                    setShowOptions(false)
                    setTimeout(() => {
                      fileInputRef.current?.click()
                    }, 100)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <span className="text-xl">💻</span>
                  <div>
                    <p className="font-medium text-gray-900">Upload foto</p>
                    <p className="text-xs text-gray-500">Vanaf computer</p>
                  </div>
                </button>
                
                {/* Take photo with camera */}
                <button
                  onClick={() => {
                    setShowOptions(false)
                    // Kleine delay zodat menu eerst sluit
                    setTimeout(() => {
                      cameraInputRef.current?.click()
                    }, 100)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-t"
                >
                  <span className="text-xl">📸</span>
                  <div>
                    <p className="font-medium text-gray-900">Maak foto</p>
                    <p className="text-xs text-gray-500">Met camera</p>
                  </div>
                </button>
                
                {/* Choose from library */}
                <button
                  onClick={() => {
                    setShowOptions(false)
                    setIsOpen(true)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-t"
                >
                  <span className="text-xl">🖼️</span>
                  <div>
                    <p className="font-medium text-gray-900">Kies uit bibliotheek</p>
                    <p className="text-xs text-gray-500">Bestaande foto's</p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {value && (
          <button
            onClick={clearImage}
            className="text-red-500 hover:text-red-600 text-sm"
          >
            ✕ Verwijderen
          </button>
        )}
      </div>
      
      {/* Click outside to close options */}
      {showOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowOptions(false)}
        />
      )}

      {/* Media Library Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-lg font-semibold">Kies een foto</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      setTimeout(() => fileInputRef.current?.click(), 100)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <span>📤</span> Upload nieuwe foto
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="p-4 border-b flex-shrink-0">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('alle')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === 'alle' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Alle
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          selectedCategory === cat 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        📁 {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {loading ? (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-500">Laden...</p>
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl block mb-4">📷</span>
                    <h4 className="font-semibold text-gray-900 mb-2">Nog geen foto's</h4>
                    <p className="text-gray-500 text-sm mb-4">
                      Upload je eerste foto
                    </p>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        setTimeout(() => fileInputRef.current?.click(), 100)
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                      📤 Upload foto
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredMedia.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => selectImage(item.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 transition-all bg-gray-100 ${
                          value === item.url ? 'ring-blue-500 ring-4' : 'ring-transparent hover:ring-gray-300'
                        }`}
                      >
                        <Image
                          src={item.url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
