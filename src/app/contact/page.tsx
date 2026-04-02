'use client'

import { Navigation, Footer, CookieBanner, ContactPageSection } from '@/components'

export default function ContactPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#E3E3E3]">
      <Navigation />
      <ContactPageSection className="!py-0 pt-24 sm:pt-28 pb-28 sm:pb-36 lg:pb-40" />
      <Footer />
      <CookieBanner />
    </main>
  )
}
