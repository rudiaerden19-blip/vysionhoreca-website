import Image from 'next/image'
import { Navigation, Footer, CookieBanner } from '@/components'
import MarketingStartAndDemoButtons from '@/components/MarketingStartAndDemoButtons'
import MarketingSectorLinks from '@/components/MarketingSectorLinks'
import {
  KLEDINGWINKEL_BREADCRUMBS,
  KLEDINGWINKEL_FAQS,
  KLEDINGWINKEL_H1,
  KLEDINGWINKEL_OG_IMAGE,
} from '@/lib/kledingwinkel-landing'
import { WINKEL_SECTOR_LINKS } from '@/lib/sector-landings'

const SECTIONS = [
  {
    id: 'waarom',
    title: 'Waarom Vysion voor een kledingwinkel',
    body: [
      'In een kledingwinkel tik je niet zomaar “trui” aan. Klanten vragen een andere maat, een andere kleur, of ze komen een week later terug met een bon. Vysion is een kassasysteem voor kledingwinkels dat verkoop en voorraad in hetzelfde scherm houdt.',
      'Je rekent af, volgt stock per variant en herkent vaste klanten — zonder een los voorraadprogramma of een extra loyaliteitsapp. Hardware en software horen bij dezelfde licentie. 14 dagen gratis proberen, zonder voorschot of installatiekosten.',
    ],
  },
  {
    id: 'varianten',
    title: 'Maten, kleuren en barcodes',
    body: [
      'Een T-shirt is één artikel, geen tien losse producten. Je legt maten zoals S, M, L en XL vast, plus de kleuren die je in de rekken hebt. Elke variant kan een eigen barcode hebben, zodat je de juiste maat-kleurcombinatie scant in plaats van te zoeken op het scherm.',
      'Heb je al stickers van de leverancier? Die gebruik je. Moet je zelf etiketten printen voor een nieuwe levering of een herprijzing, dan doe je dat vanuit hetzelfde systeem. Aan de kassa is het daarna één scan en afrekenen.',
    ],
  },
  {
    id: 'voorraad',
    title: 'Voorraad en inkoop',
    body: [
      'Je ziet per variant wat er nog ligt. Zet een minimumvoorraad, zodat je merkt wanneer M in zwart bijna op is — niet pas als de klant het vraagt. Bij een inventaris of stocktelling werk je de aantallen bij. Nieuwe collecties importeer je in één keer.',
      'Inkoop blijft bij de kassa: leveranciers, bestelbonnen en goederenontvangst. Als de doos binnenkomt, werk je de ontvangst af en staat de voorraad weer juist. Geen Excel ernaast.',
    ],
  },
  {
    id: 'retour',
    title: 'Retour, omruilen en tegoedbon',
    body: [
      'Omruilen hoort bij kleding. Je verwerkt een retour of wissel aan de kassa. Past het andere stuk niet of wil de klant later terugkomen, dan maak je meteen een tegoedbon aan.',
      'De voorraad van de teruggebrachte variant gaat weer mee, zodat je rekken en het scherm hetzelfde verhaal vertellen.',
    ],
  },
  {
    id: 'klanten',
    title: 'Klantenkaart, solden en promoties',
    body: [
      'Met een klantenkaart of winkelpas herken je terugkerende klanten en spaar je punten. Geen losse stempelkaart-app.',
      'Voor solden en tussentijdse acties zet je prijs- en kortingsacties klaar. Promoties horen bij de licentie: je past prijzen aan zonder een extra module te kopen.',
    ],
  },
  {
    id: 'team',
    title: 'Personeel en rapportage',
    body: [
      'Medewerkers klokken in en uit. Zo zie je wie wanneer in de winkel stond, naast de kassa zelf.',
      'Rapportages tonen verkoop, populaire artikelen en een bedrijfsanalyse. Handig na een weekend solden: wat ging eruit, welke maten blijven liggen, wat moet je nabestellen.',
    ],
  },
  {
    id: 'digitaal',
    title: 'Webshop, digitale bon en klantenscherm',
    body: [
      'Een eigen webshop zit in de licentie. Dezelfde producten en prijzen als in de winkel, zonder een aparte commissie-app.',
      'Na het afrekenen stuur je de digitale kassabon of een factuur per e-mail. Op het klantenscherm ziet de klant het bedrag terwijl je scant.',
    ],
  },
] as const

function CtaRow() {
  return (
    <MarketingStartAndDemoButtons demoHref="/winkel#contact" className="justify-center" />
  )
}

export default function KledingwinkelSectorPage() {
  return (
    <div className="min-h-screen bg-[#e3e3e3]">
      <Navigation />
      <main>
        <section className="pt-28 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <nav aria-label="Broodkruimel" className="mb-8 text-sm text-gray-600">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {KLEDINGWINKEL_BREADCRUMBS.map((crumb, index) => {
                  const last = index === KLEDINGWINKEL_BREADCRUMBS.length - 1
                  return (
                    <li key={crumb.path} className="flex items-center gap-2">
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

            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent mb-3">
                  Kledingwinkel, modewinkel &amp; boetiek
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-[2.15rem] font-bold text-gray-900 leading-tight text-balance">
                  {KLEDINGWINKEL_H1}
                </h1>
                <p className="mt-5 text-lg sm:text-xl text-gray-700 leading-relaxed">
                  Verkoop en voorraad in één kassa. Maten en kleuren als varianten, afrekenen met barcode,
                  hardware en software bij dezelfde licentie.
                </p>
                <ul className="mt-6 space-y-2 text-base text-gray-700">
                  <li>Voorraad per maat en kleur, niet alleen per model.</li>
                  <li>Scannen aan de kassa, etiketten printen wanneer je dat nodig hebt.</li>
                  <li>Retour, omruilen en tegoedbon horen bij de toonbank.</li>
                </ul>
                <div className="mt-8">
                  <CtaRow />
                </div>
              </div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-home-image">
                <Image
                  src={KLEDINGWINKEL_OG_IMAGE}
                  alt="Toonbank van een kledingwinkel: tegoedbon en gevouwen trui met barcode"
                  fill
                  className="object-cover object-center"
                  sizes="(min-width: 1024px) 36rem, 100vw"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {SECTIONS.map((section) => (
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

        <section
          id="hardware"
          className="border-t border-gray-200/80 bg-[#faf8f6] py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
          aria-labelledby="hardware-heading"
        >
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl">
              <h2 id="hardware-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-5">
                Hardware voor de toonbank
              </h2>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-8">
                Bij de premium licentie hoort professionele kassahardware: Elo-touchscreen, barcodescanner,
                elektrische kassalade en Epson-bonprinter — een kassa die past op een boetiektoonbank. Zonder
                hardware gebruik je de software op je eigen scherm.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <Image
                  src="/images/hardware/hardware-tf30-kassa.png"
                  alt="Elo-touchscreen kassa"
                  fill
                  className="object-contain object-center p-6"
                  sizes="(min-width: 640px) 28rem, 100vw"
                />
              </figure>
              <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <Image
                  src="/images/hardware/hardware-barcode-scanner.png"
                  alt="Barcodescanner voor de kassa"
                  fill
                  className="object-contain object-center p-6"
                  sizes="(min-width: 640px) 28rem, 100vw"
                />
              </figure>
            </div>
          </div>
        </section>

        <section
          id="prijzen"
          className="border-t border-gray-200/80 bg-white py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
          aria-labelledby="prijzen-heading"
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 id="prijzen-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-4">
              Prijzen en licentie
            </h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-6">
              Dezelfde winkellicentie als op de retailpagina: software met of zonder hardware, maandelijks
              opzegbaar, of een eenmalige levenslange licentie. Alle modules hierboven zitten in de licentie,
              geen extra factuur per functie.
            </p>
            <p className="mb-8">
              <a href="/winkel#prijzen" className="font-semibold text-accent underline-offset-2 hover:underline">
                Bekijk de prijzen voor winkels
              </a>
              {' · '}
              <a href="/prijzen" className="font-semibold text-accent underline-offset-2 hover:underline">
                Alle licenties
              </a>
            </p>
            <CtaRow />
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
              {KLEDINGWINKEL_FAQS.map((faq) => (
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
              Probeer 14 dagen gratis, of vraag een demo. Wil je eerst het bredere winkelaanbod zien?{' '}
              <a href="/winkel" className="font-semibold text-accent underline-offset-2 hover:underline">
                Bekijk het complete kassasysteem voor winkels &amp; retail
              </a>
              .
            </p>
            <CtaRow />
          </div>
        </section>

        <MarketingSectorLinks
          title="Vysion voor jouw zaak"
          links={WINKEL_SECTOR_LINKS.filter((link) => link.href !== '/sectoren/kledingwinkel')}
          compact
        />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
