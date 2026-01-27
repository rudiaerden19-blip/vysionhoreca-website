'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import MediaPicker from './MediaPicker'

interface ImageZoomSettings {
  url: string
  zoom: number      // 1 = 100%, 1.5 = 150%, etc.
  positionX: number // 0-100 (percentage)
  positionY: number // 0-100 (percentage)
}

interface ImageZoomPickerProps {
  tenantSlug: string
  value: ImageZoomSettings
  onChange: (settings: ImageZoomSettings) => void
  label?: string
}

export default function ImageZoomPicker({ tenantSlug, value, onChange, label }: ImageZoomPickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Default values
  const settings: ImageZoomSettings = {
    url: value?.url || '',
    zoom: value?.zoom || 1,
    positionX: value?.positionX ?? 50,
    // Default 60% = toon meer van onderkant (tafels/stoelen) ipv bovenkant (plafond)
    positionY: value?.positionY ?? 60,
  }

  const handleZoomChange = (newZoom: number) => {
    onChange({ ...settings, zoom: newZoom })
  }

  const handlePositionChange = (x: number, y: number) => {
    onChange({ 
      ...settings, 
      positionX: Math.max(0, Math.min(100, x)),
      positionY: Math.max(0, Math.min(100, y))
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (settings.zoom === 1) return // No dragging needed at 100%
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    handlePositionChange(x, y)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const touch = e.touches[0]
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    
    handlePositionChange(x, y)
  }

  // Add document-level mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('touchend', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [])

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      {/* Media Picker for selecting image */}
      <MediaPicker
        tenantSlug={tenantSlug}
        value={settings.url}
        onChange={(url) => onChange({ ...settings, url })}
      />
      
      {/* Zoom and Position Controls - only show if image is selected */}
      {settings.url && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-xl border">
          {/* Preview with drag-to-position */}
          <div className="relative">
            <p className="text-xs text-gray-500 mb-2">
              📍 {settings.zoom !== 1 ? 'Sleep om te positioneren' : 'Zoom om te positioneren'}
            </p>
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={() => settings.zoom !== 1 && setIsDragging(true)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className={`relative w-full h-32 rounded-lg overflow-hidden bg-gray-200 ${
                settings.zoom !== 1 ? 'cursor-move' : 'cursor-default'
              }`}
              style={{ touchAction: 'none' }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `scale(${settings.zoom})`,
                  transformOrigin: `${settings.positionX}% ${settings.positionY}%`,
                }}
              >
                <Image
                  src={settings.url}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              
              {/* Position indicator */}
              {settings.zoom !== 1 && (
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg pointer-events-none"
                  style={{
                    left: `${settings.positionX}%`,
                    top: `${settings.positionY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Zoom Slider - van 50% (uitgezoomd) tot 150% (ingezoomd) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 font-medium">🔍 Zoom</span>
              <span className="text-xs text-gray-500 font-mono">
                {Math.round(settings.zoom * 100)}% 
                {settings.zoom < 1 ? ' (uitgezoomd)' : settings.zoom > 1 ? ' (ingezoomd)' : ' (normaal)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoomChange(Math.max(0.5, settings.zoom - 0.1))}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 text-lg font-bold"
                title="Uitzoomen (meer zien)"
              >
                −
              </button>
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={settings.zoom * 100}
                onChange={(e) => handleZoomChange(parseInt(e.target.value) / 100)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <button
                onClick={() => handleZoomChange(Math.min(1.5, settings.zoom + 0.1))}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 text-lg font-bold"
                title="Inzoomen (minder zien)"
              >
                +
              </button>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>← Meer zien</span>
              <span>Minder zien →</span>
            </div>
          </div>
          
          {/* Verticale positie slider - altijd tonen */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 font-medium">↕️ Verticale positie</span>
              <span className="text-xs text-gray-500 font-mono">{settings.positionY}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.positionY}
              onChange={(e) => handlePositionChange(settings.positionX, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Bovenkant (plafond)</span>
              <span>Onderkant (tafels)</span>
            </div>
          </div>

          {/* Horizontale positie slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 font-medium">↔️ Horizontale positie</span>
              <span className="text-xs text-gray-500 font-mono">{settings.positionX}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.positionX}
              onChange={(e) => handlePositionChange(parseInt(e.target.value), settings.positionY)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Links</span>
              <span>Rechts</span>
            </div>
          </div>
          
          {/* Reset button */}
          <button
            onClick={() => onChange({ ...settings, zoom: 1, positionX: 50, positionY: 60 })}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ↺ Reset naar standaard
          </button>
        </div>
      )}
    </div>
  )
}

// Helper function to parse stored JSON settings
export function parseImageZoomSettings(json: string | null | undefined): ImageZoomSettings {
  // Default positionY 60% = toon meer van onderkant (tafels/stoelen) ipv bovenkant (plafond)
  if (!json) return { url: '', zoom: 1, positionX: 50, positionY: 60 }
  try {
    const parsed = JSON.parse(json)
    return {
      url: parsed.url || '',
      zoom: parsed.zoom || 1,
      positionX: parsed.positionX ?? 50,
      positionY: parsed.positionY ?? 60,
    }
  } catch {
    // If it's just a URL string (old format), convert it
    return { url: json, zoom: 1, positionX: 50, positionY: 60 }
  }
}

// Helper function to stringify settings for storage
export function stringifyImageZoomSettings(settings: ImageZoomSettings): string {
  return JSON.stringify(settings)
}

// Helper to get just the URL (for backward compatibility)
export function getImageUrl(settings: ImageZoomSettings | string | null | undefined): string {
  if (!settings) return ''
  if (typeof settings === 'string') return settings
  return settings.url || ''
}

// Helper to get CSS styles for displaying the image
export function getImageZoomStyles(settings: ImageZoomSettings | string | null | undefined): React.CSSProperties {
  const parsed = typeof settings === 'string' ? parseImageZoomSettings(settings) : settings
  if (!parsed || parsed.zoom <= 1) return {}
  
  return {
    transform: `scale(${parsed.zoom})`,
    transformOrigin: `${parsed.positionX}% ${parsed.positionY}%`,
  }
}
