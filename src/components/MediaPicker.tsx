'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

interface MediaItem {
  id: string
  url: string
  file_url?: string  // Database kolom naam
  name: string
  file_name?: string // Database kolom naam
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

  useEffect(() => {
    if (isOpen) {
      loadMedia()
    }
  }, [isOpen, tenantSlug])

  const loadMedia = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('tenant_media')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setMedia(data.map(item => ({
        id: item.id,
        url: item.url || item.file_url || '',  // Ondersteun beide kolom namen
        name: item.name || item.file_name || 'Foto',
        category: item.category || ''
      })))
      // Extract categories
      const cats = [...new Set(data.map(m => m.category).filter(c => c && c.trim() !== ''))]
      setCategories(cats)
    }
    
    setLoading(false)
  }

  const selectImage = (url: string) => {
    onChange(url)
    setIsOpen(false)
  }

  const clearImage = () => {
    onChange('')
  }

  // Filter media
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
      
      {/* Current Image Preview */}
      <div className="flex items-start gap-4">
        <div 
          onClick={() => setIsOpen(true)}
          className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-orange-500 transition-colors overflow-hidden bg-gray-50"
        >
          {value ? (
            <img src={value} alt="Selected" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-2">
              <span className="text-3xl block mb-1">📷</span>
              <span className="text-xs text-gray-500">{t('mediaPicker.choosePhoto')}</span>
            </div>
          )}
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

      {/* Modal */}
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
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="p-4 border-b flex-shrink-0">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('alle')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === 'alle' 
                          ? 'bg-orange-500 text-white' 
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
                            ? 'bg-orange-500 text-white' 
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
                      className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-500">Laden...</p>
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl block mb-4">📷</span>
                    <h4 className="font-semibold text-gray-900 mb-2">Nog geen foto&apos;s</h4>
                    <p className="text-gray-500 text-sm">
                      Upload eerst foto&apos;s via &quot;Foto&apos;s & Media&quot;
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredMedia.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => selectImage(item.url)}
                        className={`aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 transition-all bg-gray-100 ${
                          value === item.url ? 'ring-orange-500 ring-4' : 'ring-transparent hover:ring-gray-300'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                <p className="text-sm text-gray-500 text-center">
                  Geen foto? Ga naar <span className="text-orange-500 font-medium">Foto&apos;s & Media</span> om te uploaden
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
