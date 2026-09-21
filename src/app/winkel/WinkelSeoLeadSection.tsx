import { WINKEL_SEO_LEAD } from '@/lib/winkel-landing-seo'

/** SEO-alinea direct onder de hero — statisch in HTML, buiten de drukke hero. */
export default function WinkelSeoLeadSection() {
  return (
    <section
      id="winkel-intro"
      className="border-b border-gray-200/80 bg-white py-8 sm:py-10 px-4 sm:px-6 lg:px-8"
      aria-labelledby="winkel-intro-heading"
    >
      <div className="max-w-3xl mx-auto text-center">
        <h2 id="winkel-intro-heading" className="sr-only">
          Kassasysteem voor winkels en retail
        </h2>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">{WINKEL_SEO_LEAD}</p>
      </div>
    </section>
  )
}
