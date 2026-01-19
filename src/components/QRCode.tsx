'use client'

import { useState, useEffect, memo } from 'react'
import Image from 'next/image'

interface QRCodeProps {
  url: string
  size?: number
  className?: string
}

// Memoized QR Code component - prevents re-renders
const QRCode = memo(function QRCode({ url, size = 200, className = '' }: QRCodeProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  
  // Generate QR code URL (cached by browser)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=svg&data=${encodeURIComponent(url)}`
  
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-400 text-xs text-center px-2">
          QR niet beschikbaar
        </span>
      </div>
    )
  }
  
  return (
    <div 
      className={`relative bg-white rounded-lg overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="text-2xl">📱</span>
        </div>
      )}
      <Image
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        unoptimized // SVG doesn't need optimization
      />
    </div>
  )
})

export default QRCode
