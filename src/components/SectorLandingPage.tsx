import Image from 'next/image'
import { Navigation, Footer, CookieBanner } from '@/components'
import MarketingStartAndDemoButtons from '@/components/MarketingStartAndDemoButtons'
import MarketingSectorLinks from '@/components/MarketingSectorLinks'
import {
  sectorBreadcrumbs,
  type SectorLanding,
} from '@/lib/sector-landings'

function CtaRow({ demoHref }: { demoHref: string }) {
  return <MarketingStartAndDemoButtons demoHref={demoHref} className="justify-center" />
}

function SectorImage({
  image,
  priority,
}: {
  image: NonNullable<SectorLanding['heroImage']>
  priority?: boolean
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-home-image">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className={image.contain ? 'object-contain object-center p-6' : 'object-cover object-center'}
        sizes="(min-width: 1024px) 36rem, 100vw"
        priority={priority}
      />
    </div>
  )
}

export default function SectorLandingPage({ landing }: { landing: SectorLanding }) {
  const crumbs = sectorBreadcrumbs(landing)
  const pricingHref = landing.cluster === 'winkel' ? '/winkel#prijzen' : '/#prijzen'
  const hardwareTitle =
    landing.cluster === 'winkel' ? 'Hardware voor de toonbank' : 'Hardware in de zaak'

  return (
    <div className="min-h-screen bg-[#e3e3e3]">
      <Navigation />
      <main>
        <section className="pt-28 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <nav aria-label="Broodkruimel" className="mb-8 text-sm text-gray-600">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {crumbs.map((crumb, index) => {
                  const last = index === crumbs.length - 1
                  return (
                    <li key={`${crumb.path}-${crumb.name}`} className="flex items-center gap-2">
                      {index > 0 ? (
                        <span aria-hidden className="text-gray-400">
                          /
                        </span>
                      ) : null}
                      {last ? (
                        <span aria-current="page" className="font-medium text-gray-900">
                          {crumb.name}
                        </span>
                      ) : (
                        <a href={crumb.path} className="text-accent underline-offset-2 hover:underline">
                          {crumb.name}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ol>
            </nav>

            <div
              className={
                landing.heroImage
                  ? 'grid items-center gap-10 lg:grid-cols-2 lg:gap-14'
                  : 'max-w-3xl'
              }
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent mb-3">
                  {landing.eyebrow}
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-[2.15rem] font-bold text-gray-900 leading-tight text-balance">
                  {landing.h1}
                </h1>
                <p className="mt-5 text-lg sm:text-xl text-gray-700 leading-relaxed">{landing.intro}</p>
                <ul className="mt-6 space-y-2 text-base text-gray-700">
                  {landing.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col items-start gap-3 sm:items-stretch">
                  <CtaRow demoHref={landing.demoHref} />
                  <p className="text-sm text-gray-600 text-center sm:text-left">
                    <a href="/prijzen" className="font-semibold text-accent underline-offset-2 hover:underline">
                      Bekijk prijzen en licenties
                    </a>
                    {' · '}
                    <a href={landing.hubHref} className="font-semibold text-accent underline-offset-2 hover:underline">
                      {landing.cluster === 'winkel' ? 'Alle winkelfuncties' : 'Alle horecafuncties'}
                    </a>
                  </p>
                </div>
              </div>
              {landing.heroImage ? <SectorImage image={landing.heroImage} priority /> : null}
            </div>
          </div>
        </section>

        {landing.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="border-t border-gray-200/80 bg-white py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
            aria-labelledby={`${section.id}-heading`}
          >
            <div className="max-w-3xl mx-auto">
              <h2
                id={`${section.id}-heading`}
                className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-5"
              >
                {section.title}
              </h2>
              <div className="space-y-4 text-base sm:text-lg text-gray-700 leading-relaxed">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        ))}

        {landing.extraImage ? (
          <section className="border-t border-gray-200/80 bg-white py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <SectorImage image={landing.extraImage} />
            </div>
          </section>
        ) : null}

        <section
          id="hardware"
          className="border-t border-gray-200/80 bg-[#faf8f6] py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
          aria-labelledby="hardware-heading"
        >
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl">
              <h2 id="hardware-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-5">
                {hardwareTitle}
              </h2>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-8">{landing.hardware}</p>
            </div>
            {landing.hardwareImages?.length ? (
              <div className={`grid gap-6 ${landing.hardwareImages.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl'}`}>
                {landing.hardwareImages.map((image) => (
                  <figure
                    key={image.src}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className={image.contain ? 'object-contain object-center p-6' : 'object-cover object-center'}
                      sizes="(min-width: 640px) 28rem, 100vw"
                    />
                  </figure>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section
          id="prijzen"
          className="border-t border-gray-200/80 bg-white py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
          aria-labelledby="prijzen-heading"
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 id="prijzen-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-4">
              Prijzen en starten
            </h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-6">
              14 dagen gratis proberen, zonder voorschot of installatiekosten. Software met of zonder
              hardware, maandelijks opzegbaar, of een eenmalige levenslange licentie. Modules horen bij de
              licentie, geen aparte factuur per functie.
            </p>
            <p className="mb-8">
              <a href={pricingHref} className="font-semibold text-accent underline-offset-2 hover:underline">
                {landing.cluster === 'winkel' ? 'Bekijk de prijzen voor winkels' : 'Bekijk de horecaprijzen'}
              </a>
              {' · '}
              <a href="/prijzen" className="font-semibold text-accent underline-offset-2 hover:underline">
                Alle licenties
              </a>
            </p>
            <CtaRow demoHref={landing.demoHref} />
          </div>
        </section>

        <section
          id="faq"
          className="border-t border-gray-200/80 bg-[#e3e3e3] py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
          aria-labelledby="faq-heading"
        >
          <div className="max-w-3xl mx-auto">
            <h2 id="faq-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-8">
              Veelgestelde vragen
            </h2>
            <dl className="space-y-6">
              {landing.faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
                  <dt className="text-lg font-semibold text-gray-900">{faq.question}</dt>
                  <dd className="mt-2 text-base text-gray-700 leading-relaxed">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-gray-200/80 bg-white py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-4">
              Klaar om te starten?
            </h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-8">
              Probeer 14 dagen gratis, of vraag een demo.{' '}
              <a href={landing.hubHref} className="font-semibold text-accent underline-offset-2 hover:underline">
                {landing.hubLabel}
              </a>
              .
            </p>
            <CtaRow demoHref={landing.demoHref} />
          </div>
        </section>

        <MarketingSectorLinks
          title="Vysion voor jouw zaak"
          links={landing.related}
          compact
        />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
