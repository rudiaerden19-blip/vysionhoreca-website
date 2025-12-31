'use client'

import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent')
    if (!cookieConsent) {
      setShowBanner(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    setShowBanner(false)
  }

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-dark text-white p-4 md:p-6 z-50 shadow-2xl border-t border-gray-700">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm md:text-base">
            🍪 Wij gebruiken cookies om je ervaring te verbeteren. Door verder te gaan ga je akkoord met ons{' '}
            <a href="/juridisch/cookies" className="text-accent hover:underline">cookiebeleid</a>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={declineCookies}
            className="px-4 py-2 text-sm border border-gray-500 rounded-full hover:bg-gray-700 transition-colors"
          >
            Weigeren
          </button>
          <button
            onClick={acceptCookies}
            className="px-6 py-2 text-sm bg-accent text-white rounded-full hover:bg-accent/90 transition-colors font-semibold"
          >
            Accepteren
          </button>
        </div>
      </div>
    </div>
  )
}
