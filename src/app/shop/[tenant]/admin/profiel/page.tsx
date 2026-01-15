'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ProfielPage({ params }: { params: { tenant: string } }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [formData, setFormData] = useState({
    name: 'Frituur De Gouden Friet',
    tagline: 'Ambachtelijke frieten sinds 1985',
    description: 'De lekkerste frieten van de regio! Ambachtelijk bereid met verse Belgische aardappelen, gebakken in rundvet.',
    story: 'Al meer dan 35 jaar serveren wij de lekkerste frieten van Pelt. Onze frituur is een familiebedrijf, opgericht door onze grootouders in 1985. Wij gebruiken alleen de beste Bintje aardappelen, vers geschild en dubbel gebakken in rundvet. Dat proef je!',
    address: 'Marktplein 15',
    city: '3900 Pelt',
    country: 'België',
    phone: '+32 11 12 34 56',
    email: 'info@degoudenfriet.be',
    website: '',
    vatNumber: 'BE0123456789',
    facebook: 'https://facebook.com/degoudenfriet',
    instagram: 'https://instagram.com/degoudenfriet',
    tiktok: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zaak profiel</h1>
          <p className="text-gray-500">Beheer de basisinformatie van je zaak</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {saving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              <span>Opslaan...</span>
            </>
          ) : saved ? (
            <>
              <span>✓</span>
              <span>Opgeslagen!</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Opslaan</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>🏪</span> Basisinformatie
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naam van je zaak *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Bijv. Frituur De Gouden Friet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tagline / Slogan
              </label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Bijv. Ambachtelijke frieten sinds 1985"
              />
              <p className="text-sm text-gray-500 mt-1">Dit verschijnt onder je zaaknaam op de website</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Korte beschrijving
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                placeholder="Beschrijf je zaak in een paar zinnen..."
              />
              <p className="text-sm text-gray-500 mt-1">{formData.description.length}/200 karakters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ons verhaal
              </label>
              <textarea
                name="story"
                value={formData.story}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                placeholder="Vertel het verhaal van je zaak..."
              />
              <p className="text-sm text-gray-500 mt-1">Dit verschijnt in de &quot;Over ons&quot; sectie</p>
            </div>
          </div>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>📍</span> Contactgegevens
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adres *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Straat en huisnummer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postcode & Plaats *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Bijv. 3900 Pelt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Land
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefoonnummer *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="+32 11 12 34 56"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadres *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="info@jouwzaak.be"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BTW-nummer
              </label>
              <input
                type="text"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="BE0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website (optioneel)
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://jouwzaak.be"
              />
            </div>
          </div>
        </motion.div>

        {/* Social Media */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>📱</span> Social Media
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>📘</span> Facebook
              </label>
              <input
                type="url"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://facebook.com/jouwzaak"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>📸</span> Instagram
              </label>
              <input
                type="url"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://instagram.com/jouwzaak"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>🎵</span> TikTok
              </label>
              <input
                type="url"
                name="tiktok"
                value={formData.tiktok}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://tiktok.com/@jouwzaak"
              />
            </div>
          </div>
        </motion.div>

        {/* Preview Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Bekijk je website</h3>
              <p className="text-white/80 text-sm">Zie hoe je wijzigingen eruitzien op de live website</p>
            </div>
            <a
              href={`/shop/${params.tenant}`}
              target="_blank"
              className="bg-white text-orange-500 font-medium px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <span>Bekijk website</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
