'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Navigation from '@/components/Navigation'

const countries = [
  { code: 'BE', name: 'België', flag: '🇧🇪' },
  { code: 'NL', name: 'Nederland', flag: '🇳🇱' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'OTHER', name: 'Ander land', flag: '🌍' },
]

export default function ResellersPage() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    website: '',
    experience: '',
    motivation: '',
    expected_clients: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/partner-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Er ging iets mis. Probeer het opnieuw.')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    }

    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-dark">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-accent/20 text-accent rounded-full text-sm font-medium mb-6">
              🤝 Partner Programma
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Word <span className="text-accent">Vysion Reseller</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Verkoop Vysion Horeca in jouw land of regio. Verdien commissie op elke klant die je binnenhaalt. 
              Wij leveren de software, jij levert de klanten.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-dark/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Waarom Vysion Reseller worden?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '💰',
                title: 'Verdien tot 30% commissie',
                description: 'Ontvang maandelijks commissie op elke actieve klant. Passief inkomen dat groeit.',
              },
              {
                icon: '🌍',
                title: '9 talen ingebouwd',
                description: 'De software werkt direct in NL, EN, FR, DE, ES, IT, JA, ZH en AR. Klaar voor jouw markt.',
              },
              {
                icon: '📱',
                title: 'WhatsApp Bestellen',
                description: 'Unieke feature die geen concurrent heeft. Makkelijk te verkopen aan horeca.',
              },
              {
                icon: '🎯',
                title: 'Eigen Partner Dashboard',
                description: 'Bekijk je klanten, commissies en statistieken in real-time.',
              },
              {
                icon: '🛠️',
                title: 'Wij doen de techniek',
                description: 'Jij verkoopt, wij zorgen voor hosting, updates en technische support.',
              },
              {
                icon: '📈',
                title: 'Groeiende markt',
                description: 'Horeca digitaliseert snel. QR bestellen en online ordering zijn de toekomst.',
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-2xl p-6 border border-white/10"
              >
                <span className="text-4xl mb-4 block">{benefit.icon}</span>
                <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Commissie Structuur
          </h2>
          
          <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl p-8 border border-accent/30">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center p-6 bg-dark/50 rounded-2xl">
                <p className="text-gray-400 mb-2">Maandelijkse commissie</p>
                <p className="text-5xl font-bold text-accent mb-2">30%</p>
                <p className="text-gray-400 text-sm">van het maandabonnement</p>
              </div>
              <div className="text-center p-6 bg-dark/50 rounded-2xl">
                <p className="text-gray-400 mb-2">Setup fee commissie</p>
                <p className="text-5xl font-bold text-accent mb-2">50%</p>
                <p className="text-gray-400 text-sm">van eenmalige setup kosten</p>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-dark/50 rounded-2xl">
              <h4 className="text-white font-bold mb-4">Rekenvoorbeeld:</h4>
              <div className="space-y-2 text-gray-300">
                <p>• Klant betaalt €69/maand → Jij krijgt <span className="text-accent font-bold">€20,70/maand</span></p>
                <p>• 10 klanten = <span className="text-accent font-bold">€207/maand passief inkomen</span></p>
                <p>• 50 klanten = <span className="text-accent font-bold">€1.035/maand passief inkomen</span></p>
                <p>• 100 klanten = <span className="text-accent font-bold">€2.070/maand passief inkomen</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-20 px-4 bg-dark/50" id="aanmelden">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Word Reseller
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Vul het formulier in en we nemen binnen 48 uur contact met je op.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/20 border border-green-500/50 rounded-2xl p-8 text-center"
            >
              <span className="text-5xl mb-4 block">✅</span>
              <h3 className="text-2xl font-bold text-white mb-2">Aanvraag ontvangen!</h3>
              <p className="text-gray-300">
                Bedankt voor je interesse. We bekijken je aanvraag en nemen binnen 48 uur contact met je op.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300">
                  {error}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">Bedrijfsnaam *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Jouw bedrijf"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Contactpersoon *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Jouw naam"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="email@voorbeeld.com"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Telefoon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="+32 ..."
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">Land *</label>
                  <select
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="" className="bg-dark">Selecteer land</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code} className="bg-dark">
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Stad</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Jouw stad"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Website (optioneel)</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Ervaring in sales/horeca</label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                  placeholder="Vertel over je ervaring..."
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Waarom wil je reseller worden?</label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                  placeholder="Jouw motivatie..."
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Hoeveel klanten verwacht je per jaar?</label>
                <select
                  value={formData.expected_clients}
                  onChange={(e) => setFormData({ ...formData, expected_clients: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="" className="bg-dark">Selecteer</option>
                  <option value="1-10" className="bg-dark">1-10 klanten</option>
                  <option value="10-25" className="bg-dark">10-25 klanten</option>
                  <option value="25-50" className="bg-dark">25-50 klanten</option>
                  <option value="50-100" className="bg-dark">50-100 klanten</option>
                  <option value="100+" className="bg-dark">100+ klanten</option>
                </select>
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block"
                    />
                    Verzenden...
                  </span>
                ) : (
                  '🚀 Aanvraag versturen'
                )}
              </motion.button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Veelgestelde vragen
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'Hoeveel kost het om reseller te worden?',
                a: 'Niets! Er zijn geen kosten om partner te worden. Je verdient alleen commissie op de klanten die je binnenhaalt.',
              },
              {
                q: 'Wanneer ontvang ik mijn commissie?',
                a: 'Commissies worden maandelijks berekend en uitbetaald rond de 15e van de maand voor de vorige maand.',
              },
              {
                q: 'Moet ik technische kennis hebben?',
                a: 'Nee, wij zorgen voor alle techniek. Jij hoeft alleen te verkopen en we helpen je met training en materiaal.',
              },
              {
                q: 'Kan ik reseller worden in elk land?',
                a: 'Ja! De software ondersteunt 9 talen en werkt wereldwijd. We zoeken partners in alle landen.',
              },
              {
                q: 'Krijg ik exclusiviteit in mijn regio?',
                a: 'We bespreken exclusiviteit op basis van je verwachte volume en commitment. Neem contact op voor details.',
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden group"
              >
                <summary className="px-6 py-4 cursor-pointer text-white font-medium flex items-center justify-between">
                  {faq.q}
                  <span className="text-accent group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-gray-400">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Klaar om te starten?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Word vandaag nog Vysion Reseller en begin met verdienen.
          </p>
          <a
            href="#aanmelden"
            className="inline-block px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-full font-bold text-lg transition-all"
          >
            🤝 Word Reseller
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>© 2026 Vysion Horeca. Alle rechten voorbehouden.</p>
        </div>
      </footer>
    </div>
  )
}
