import { MARKETING_FAQ_KASSA_AANPASSEN } from '@/lib/marketing-kassa-aanpassen-faq'

/** Zelfde kassa-aanpassen-FAQ als op sectorlandings (NL, crawlbaar). */
export default function MarketingKassaAanpassenFaqSection() {
  const faq = MARKETING_FAQ_KASSA_AANPASSEN
  return (
    <section
      id="faq-kassa-aanpassen"
      className="border-t border-gray-200/80 bg-[#e3e3e3] py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
      aria-labelledby="faq-kassa-aanpassen-heading"
    >
      <div className="max-w-3xl mx-auto">
        <h2 id="faq-kassa-aanpassen-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-8">
          Veelgestelde vragen
        </h2>
        <dl className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <dt className="text-lg font-semibold text-gray-900">{faq.question}</dt>
            <dd className="mt-2 text-base text-gray-700 leading-relaxed">{faq.answer}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
