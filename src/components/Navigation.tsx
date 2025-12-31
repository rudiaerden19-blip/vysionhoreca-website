'use client'

import { useState } from 'react'

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-bold">
              <span className="text-accent">Vysion</span>
              <span className="text-gray-400 font-normal ml-1">horeca</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#functies" className="text-gray-300 hover:text-white transition-colors">Functies</a>
            <a href="#prijzen" className="text-gray-300 hover:text-white transition-colors">Prijzen</a>
            <a href="#over-ons" className="text-gray-300 hover:text-white transition-colors">Over ons</a>
            <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <a href="/login" className="text-white hover:text-accent transition-colors">Inloggen</a>
            <a href="#demo" className="bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-full font-medium transition-all">
              Gratis proberen
            </a>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700">
            <div className="flex flex-col space-y-4">
              <a href="#functies" className="text-gray-300 hover:text-white transition-colors">Functies</a>
              <a href="#prijzen" className="text-gray-300 hover:text-white transition-colors">Prijzen</a>
              <a href="#over-ons" className="text-gray-300 hover:text-white transition-colors">Over ons</a>
              <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
              <a href="#demo" className="bg-accent text-white px-6 py-3 rounded-full font-medium text-center">
                Gratis proberen
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
