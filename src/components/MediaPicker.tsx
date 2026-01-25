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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
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

  // Comprimeer afbeelding voor snellere upload
  const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      // Als het geen afbeelding is, return origineel
      if (!file.type.startsWith('image/')) {
        resolve(file)
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Schaal af als groter dan maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name || 'photo.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                resolve(file)
              }
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = () => resolve(file)
        img.src = e.target?.result as string
      }
      reader.onerror = () => resolve(file)
      reader.readAsDataURL(file)
    })
  }

  const handleUpload = async (file: File) => {
    setErrorMessage(null)
    
    if (!file) {
      setErrorMessage('Geen bestand geselecteerd')
      return
    }
    if (!supabase) {
      setErrorMessage('Database niet verbonden')
      return
    }
    
    setUploading(true)
    setShowOptions(false)
    
    try {
      // Comprimeer de afbeelding voor snellere upload (max 1200px breed, 80% kwaliteit)
      const compressedFile = await compressImage(file, 1200, 0.8)
      // Gecomprimeerde files zijn altijd JPEG
      const fileExt = 'jpg'
      
      // Genereer unieke bestandsnaam
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const fileName = `${tenantSlug}/${timestamp}-${randomId}.${fileExt}`
      
      // Upload gecomprimeerde file naar Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, compressedFile, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/jpeg'
        })
      
      if (uploadError) {
        setErrorMessage(`Upload fout: ${uploadError.message}`)
        setUploading(false)
        return
      }
      
      // Haal publieke URL op
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)
      
      const publicUrl = urlData.publicUrl
      
      // Sla op in tenant_media tabel
      const displayName = file.name || `Foto ${new Date().toLocaleDateString('nl-NL')}`
      await supabase
        .from('tenant_media')
        .insert({
          tenant_slug: tenantSlug,
          url: publicUrl,
          file_url: publicUrl,
          name: displayName,
          file_name: displayName,
          category: 'Uploads',
          file_size: compressedFile.size || 0,
          file_type: 'image/jpeg'
        })
      
      // Selecteer direct de geüploade foto
      onChange(publicUrl)
      
      // Herlaad media bibliotheek
      loadMedia()
      
    } catch (error: any) {
      setErrorMessage(`Fout: ${error?.message || 'Onbekende fout'}`)
    } finally {
      // Zorg dat uploading ALTIJD op false gezet wordt
      setUploading(false)
    }
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

  // Verwijder foto uit media bibliotheek (werkt voor alle tenants)
  const deleteMedia = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation() // Voorkom selectie van de foto
    
    if (!confirm('Weet je zeker dat je deze foto wilt verwijderen?')) {
      return
    }
    
    setDeletingId(item.id)
    
    try {
      // 1. Verwijder uit tenant_media tabel
      const { error: dbError } = await supabase
        .from('tenant_media')
        .delete()
        .eq('id', item.id)
        .eq('tenant_slug', tenantSlug) // Extra veiligheid: alleen eigen tenant
      
      if (dbError) {
        console.error('Database delete error:', dbError)
        alert('Fout bij verwijderen uit database')
        setDeletingId(null)
        return
      }
      
      // 2. Probeer ook uit Storage te verwijderen (als het een Supabase URL is)
      try {
        const url = item.url
        if (url.includes('supabase') && url.includes('/media/')) {
          // Haal bestandsnaam uit URL: .../media/tenant-slug/filename.jpg
          const pathMatch = url.match(/\/media\/(.+)$/)
          if (pathMatch && pathMatch[1]) {
            const storagePath = decodeURIComponent(pathMatch[1])
            await supabase.storage.from('media').remove([storagePath])
          }
        }
      } catch (storageError) {
        // Storage verwijderen is niet kritisch, log alleen
        console.warn('Storage delete warning:', storageError)
      }
      
      // 3. Als de verwijderde foto geselecteerd was, wis de selectie
      if (value === item.url) {
        onChange('')
      }
      
      // 4. Herlaad media bibliotheek
      loadMedia()
      
    } catch (error: any) {
      console.error('Delete error:', error)
      alert('Fout bij verwijderen: ' + (error?.message || 'Onbekende fout'))
    } finally {
      setDeletingId(null)
    }
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
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
        onChange={handleFileSelect}
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
      />
      {/* Camera input - capture attribuut opent camera op mobiel/tablet */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture
        onChange={handleFileSelect}
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
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
          
          {/* Options Dropdown - opent BOVEN het foto venster */}
          <AnimatePresence>
            {showOptions && !uploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border z-50 overflow-hidden min-w-[220px]"
              >
                {/* Upload from computer/device */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowOptions(false)
                    setErrorMessage(null)
                    setTimeout(() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                        fileInputRef.current.click()
                      }
                    }, 200)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors"
                >
                  <span className="text-xl">📁</span>
                  <div>
                    <p className="font-medium text-gray-900">Kies foto</p>
                    <p className="text-xs text-gray-500">Uit fotobibliotheek</p>
                  </div>
                </button>
                
                {/* Take photo with camera */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowOptions(false)
                    setErrorMessage(null)
                    // Langere delay voor iOS
                    setTimeout(() => {
                      if (cameraInputRef.current) {
                        cameraInputRef.current.value = ''
                        cameraInputRef.current.click()
                      }
                    }, 200)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-t"
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
        
        <div className="flex flex-col gap-2">
          {value && (
            <button
              onClick={clearImage}
              className="text-red-500 hover:text-red-600 text-sm"
            >
              ✕ Verwijderen
            </button>
          )}
          
          {/* Error message display */}
          {errorMessage && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm max-w-[200px]">
              <p className="font-medium">⚠️ Fout:</p>
              <p className="text-xs mt-1">{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage(null)}
                className="text-xs underline mt-2"
              >
                Sluiten
              </button>
            </div>
          )}
        </div>
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
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 transition-all bg-gray-100 group ${
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
                        {/* Delete button - verschijnt bij hover */}
                        <button
                          onClick={(e) => deleteMedia(e, item)}
                          disabled={deletingId === item.id}
                          className="absolute top-1 right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg disabled:opacity-50"
                          title="Verwijderen"
                        >
                          {deletingId === item.id ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                          ) : (
                            <span className="text-sm">✕</span>
                          )}
                        </button>
                        {/* Selected indicator */}
                        {value === item.url && (
                          <div className="absolute bottom-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
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
