import type { Metadata } from 'next'
import { VYSION_BRAND_SITE_NAME, VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

export type SectorCluster = 'winkel' | 'horeca'

export type SectorFaq = { question: string; answer: string }

export type SectorSection = { id: string; title: string; body: string[] }

export type SectorHeroImage = { src: string; alt: string; contain?: boolean }

export type SectorLanding = {
  slug: string
  path: string
  cluster: SectorCluster
  title: string
  description: string
  h1: string
  eyebrow: string
  intro: string
  bullets: string[]
  heroImage?: SectorHeroImage
  extraImage?: SectorHeroImage
  sections: SectorSection[]
  hardware: string
  hardwareImages?: SectorHeroImage[]
  faqs: SectorFaq[]
  breadcrumbLabel: string
  related: Array<{ href: string; label: string }>
  hubHref: string
  hubLabel: string
  demoHref: string
  ogImage: string
}

const BRAND = VYSION_BRAND_SITE_NAME

const WINKEL_RELATED = [
  { href: '/sectoren/kledingwinkel', label: 'Kledingwinkel' },
  { href: '/sectoren/bakkerij', label: 'Bakkerij' },
  { href: '/sectoren/slagerij', label: 'Slagerij' },
  { href: '/sectoren/kapper', label: 'Kapper' },
  { href: '/sectoren/nachtwinkel', label: 'Nachtwinkel' },
]

const HORECA_RELATED = [
  { href: '/sectoren/restaurant', label: 'Restaurant' },
  { href: '/sectoren/cafe', label: 'Café' },
  { href: '/sectoren/frituur', label: 'Frituur' },
  { href: '/sectoren/kebab', label: 'Kebabzaak' },
]

function relatedExcept(list: typeof WINKEL_RELATED, href: string) {
  return list.filter((item) => item.href !== href)
}

export const SECTOR_LANDINGS: Record<string, SectorLanding> = {
  bakkerij: {
    slug: 'bakkerij',
    path: '/sectoren/bakkerij',
    cluster: 'winkel',
    title: `Kassasysteem voor bakkerijen | ${BRAND}`,
    description:
      'Kassasysteem voor bakkers: snel afrekenen in de ochtendspits, producten op het scherm, voorraad, webshop en rapporten in één licentie.',
    h1: 'Kassasysteem voor jouw bakkerij',
    eyebrow: 'Bakker & bakkerij',
    intro:
      'Brood, koffiekoeken en een rij tot aan de deur. Vysion is een kassasysteem voor bakkerijen: tik of scan, houd stock bij en bied dezelfde producten online aan.',
    bullets: [
      'Snel tikken tijdens de ochtendspits, met productfoto’s op het scherm.',
      'Voorraad voor verpakte artikelen, zonder een extra programma.',
      'Eigen website of webshop in dezelfde licentie.',
    ],
    heroImage: {
      src: '/images/sectoren/bakkerij-hero.jpg',
      alt: 'Bakker aan het werk: broodjes snijden en verse bollerig brood in de bakkerij',
    },
    extraImage: {
      src: '/images/sectoren/bakkerij-assortiment.jpg',
      alt: 'Assortiment gebak en taart in de toonbank van een bakkerij',
    },
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een bakkerij',
        body: [
          'Een bakker tikt geen menukaart van twintig gangen. Je wilt pistolets, koffiekoeken en melk snel raken, eventueel met barcode voor verpakte goederen. Vysion houdt kassa, voorraad en je eigen webshop in één scherm.',
          'Hardware en software horen bij dezelfde licentie. 14 dagen gratis proberen, zonder voorschot of installatiekosten.',
        ],
      },
      {
        id: 'verkoop',
        title: 'Afrekenen in de ochtendspits',
        body: [
          'Zet brood en banket als tegels op het scherm, of scan verpakte artikelen. Minder zoeken, meer doorstroming aan de toonbank.',
          'Op het klantenscherm ziet de klant het bedrag. De digitale kassabon of een factuur stuur je per e-mail als dat nodig is.',
        ],
      },
      {
        id: 'voorraad',
        title: 'Voorraad en inkoop',
        body: [
          'Voor verpakte producten, dranken en diepvries zie je de actuele voorraad en een minimumvoorraad. Na een levering verwerk je goederenontvangst. Producten importeer je in één keer.',
          'Leveranciers, inkoop en bestelbonnen blijven bij de kassa. Geen losse stock-app naast de kassa.',
        ],
      },
      {
        id: 'online',
        title: 'Webshop en vaste klanten',
        body: [
          'Bestellingen voor het weekend of feestdagen kan de klant online plaatsen. Dezelfde producten als in de winkel, zonder een aparte commissie-app.',
          'Met een klantenkaart of punten herken je terugkerende klanten. Promoties en kortingen zet je klaar in hetzelfde systeem.',
        ],
      },
      {
        id: 'team',
        title: 'Personeel en rapportage',
        body: [
          'Medewerkers klokken in en uit. Rapportages tonen verkoop, populaire artikelen en een bedrijfsanalyse — handig na een drukke zondag.',
        ],
      },
    ],
    hardware:
      'Bij de premium licentie hoort professionele kassahardware: Elo-touchscreen, optionele barcodescanner, elektrische kassalade en Epson-bonprinter. Zonder hardware gebruik je de software op je eigen scherm.',
    hardwareImages: [
      {
        src: '/images/sectoren/bakkerij-hardware-kassa.jpg',
        alt: 'Touchscreenkassa aan de toonbank in een bakkerij, medewerker bedient klant',
      },
      {
        src: '/images/sectoren/bakkerij-hardware-betalen.jpg',
        alt: 'Klant betaalt aan de kassa in een bakkerij met koffie en gebak op de toonbank',
      },
    ],
    faqs: [
      {
        question: 'Kan ik brood en banket snel aantikken?',
        answer: 'Ja. Je zet producten als tegels op het scherm. Verpakte artikelen kun je scannen met een barcode.',
      },
      {
        question: 'Kan ik voorraad bijhouden in de bakkerij?',
        answer:
          'Ja. Voorraad, minimumvoorraad, goederenontvangst en productimport zitten in het systeem. Dat is vooral nuttig voor verpakte goederen en dranken.',
      },
      {
        question: 'Kan ik bestellingen online laten plaatsen?',
        answer: 'Ja. Een eigen website of webshop hoort bij de licentie, met dezelfde producten als in de winkel.',
      },
      {
        question: 'Kan ik zien wat het best verkoopt?',
        answer: 'Ja. Rapportages en populaire artikelen tonen wat eruit gaat, klaar voor je nabestelling.',
      },
    ],
    breadcrumbLabel: 'Bakkerij',
    related: relatedExcept(WINKEL_RELATED, '/sectoren/bakkerij'),
    hubHref: '/winkel',
    hubLabel: 'Bekijk het complete kassasysteem voor winkels & retail',
    demoHref: '/winkel#contact',
    ogImage: '/images/sectoren/bakkerij-hero.jpg',
  },
  slagerij: {
    slug: 'slagerij',
    path: '/sectoren/slagerij',
    cluster: 'winkel',
    title: `Kassasysteem voor slagerijen | ${BRAND}`,
    description:
      'Kassasysteem voor slagers: toonbankverkoop, barcode, voorraad, inkoop, etiketten en klantenkaart in één licentie.',
    h1: 'Kassasysteem voor jouw slagerij',
    eyebrow: 'Slager & slagerij',
    intro:
      'Aan de toonbank wil je vlot afrekenen en weten wat er nog in de koelcel ligt. Vysion is een kassasysteem voor slagerijen: verkoop, voorraad en inkoop in hetzelfde scherm.',
    bullets: [
      'Tik of scan aan de toonbank.',
      'Voorraad, minimumvoorraad en goederenontvangst per artikel.',
      'Etiketten printen en een klantenkaart voor vaste klanten.',
    ],
    heroImage: {
      src: '/images/sectoren/slagerij-hero.jpg',
      alt: 'Slager aan het werk met vers vlees aan de toonbank',
    },
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een slagerij',
        body: [
          'Een slagerij draait om de toonbank: snel afrekenen, het juiste artikel, en stock die klopt na de leverancier. Vysion koppelt kassaverkoop aan voorraad en inkoop, zonder een extra pakket.',
          'Hardware en software horen bij dezelfde licentie. 14 dagen gratis proberen.',
        ],
      },
      {
        id: 'verkoop',
        title: 'Verkoop aan de toonbank',
        body: [
          'Artikelen tik je aan of je scant een barcode. Heb je eigen stickers nodig, dan print je etiketten vanuit hetzelfde systeem.',
          'Op het klantenscherm ziet de klant de prijs. De kassabon of factuur kan per e-mail.',
        ],
      },
      {
        id: 'voorraad',
        title: 'Voorraad, inkoop en leveranciers',
        body: [
          'Je ziet de actuele voorraad en zet een minimumvoorraad. Bij levering werk je goederenontvangst af. Inventaris of stocktelling hoort erbij.',
          'Leveranciers, inkoop en bestelbonnen blijven in het kassasysteem. Producten importeer je in één keer, of je scant/fotografeert een artikel via je telefoon.',
        ],
      },
      {
        id: 'klanten',
        title: 'Vaste klanten en acties',
        body: [
          'Klantenkaart, winkelpas en punten zitten in de licentie. Prijs- en kortingsacties zet je klaar zonder extra software.',
        ],
      },
      {
        id: 'team',
        title: 'Personeel en rapportage',
        body: [
          'In- en uitklokken, rapportages, populaire artikelen en bedrijfsanalyse. Zo zie je wat eruit gaat na een druk weekend.',
        ],
      },
    ],
    hardware:
      'Premium licentie: Elo-touchscreen, barcodescanner, elektrische kassalade en Epson-bonprinter. Zonder hardware gebruik je je eigen scherm.',
    hardwareImages: [
      {
        src: '/images/sectoren/slagerij-hardware-kassa.jpg',
        alt: 'Kassasysteem met weegschaal aan de toonbank, slager scant verpakkingen',
      },
    ],
    faqs: [
      {
        question: 'Kan ik met een barcodescanner werken in de slagerij?',
        answer: 'Ja. Je scant artikelen aan de kassa of print zelf etiketten voor je eigen codes.',
      },
      {
        question: 'Kan ik voorraad en leveranciers bijhouden?',
        answer: 'Ja. Voorraad, minimumvoorraad, inkoop, bestelbonnen en goederenontvangst zitten in het systeem.',
      },
      {
        question: 'Kan ik een klantenkaart gebruiken?',
        answer: 'Ja. Klantenkaart, winkelpas en punten horen bij de licentie.',
      },
      {
        question: 'Kan ik producten importeren?',
        answer: 'Ja. Bulkimport, of een artikel scannen of fotograferen via je telefoon.',
      },
    ],
    breadcrumbLabel: 'Slagerij',
    related: relatedExcept(WINKEL_RELATED, '/sectoren/slagerij'),
    hubHref: '/winkel',
    hubLabel: 'Bekijk het complete kassasysteem voor winkels & retail',
    demoHref: '/winkel#contact',
    ogImage: '/images/sectoren/slagerij-hero.jpg',
  },
  kapper: {
    slug: 'kapper',
    path: '/sectoren/kapper',
    cluster: 'winkel',
    title: `Kassasysteem voor kappers | ${BRAND}`,
    description:
      'Kassasysteem voor kappers en salons: afsprakenagenda, afrekenen van behandelingen en producten, klantenkaart, personeel en rapporten in één licentie.',
    h1: 'Kassasysteem voor jouw kapsalon',
    eyebrow: 'Kapper & salon',
    intro:
      'Aan de balie wil je knipbeurt, kleur en shampoo snel afrekenen. Vysion is een kassasysteem voor kappers: behandelingen, producten, klantenkaart en uren in één scherm.',
    bullets: [
      'Kappersagenda met online afspraken, naast je kassa.',
      'Behandelingen en winkelproducten op hetzelfde scherm.',
      'Klantenkaart, personeel en rapportages in één licentie.',
    ],
    heroImage: {
      src: '/images/sectoren/kapper-hero.jpg',
      alt: 'Kapper knipt haar met schaar en kam in de salon',
    },
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een kapper',
        body: [
          'In een salon verkoop je tijd én producten. Vysion laat je beide afrekenen zonder een losse kassa naast een losse winkelapp. Voorraad van shampoos en merken blijft bij de kassa.',
          'Kassa, kappersagenda, klantenkaart en rapportage horen bij dezelfde licentie — geen losse salonsoftware ernaast. Hardware en software in één pakket. 14 dagen gratis proberen.',
        ],
      },
      {
        id: 'verkoop',
        title: 'Behandelingen en producten',
        body: [
          'Zet knippen, kleuren en verzorging als tegels. Winkelproducten scan je of tik je aan. Op het klantenscherm ziet de gast het bedrag.',
          'Digitale kassabon of factuur per e-mail. Retour of tegoedbon als iemand een product terugbrengt.',
        ],
      },
      {
        id: 'voorraad',
        title: 'Voorraad in de toonbank',
        body: [
          'Shampoo, verf en merken: actuele voorraad, minimumvoorraad, inkoop en goederenontvangst. Productimport of een artikel fotograferen via je telefoon.',
        ],
      },
      {
        id: 'klanten',
        title: 'Klantenkaart en acties',
        body: [
          'Klantenkaart, winkelpas en punten horen bij de licentie. Kortingen en acties zet je klaar zonder extra software.',
        ],
      },
      {
        id: 'team',
        title: 'Team en rapportage',
        body: [
          'Medewerkers klokken in en uit. Rapportages, populaire artikelen en bedrijfsanalyse tonen wat de salon echt verkoopt.',
        ],
      },
    ],
    hardware:
      'Premium licentie: Elo-touchscreen, optionele scanner, kassalade en Epson-bonprinter. Zonder hardware werkt de software op je eigen scherm.',
    hardwareImages: [
      {
        src: '/images/sectoren/kapper-hardware-kassa.jpg',
        alt: 'Touchscreenkassa met klantenscherm aan de salonbalie',
      },
      {
        src: '/images/sectoren/kapper-hardware-betalen.jpg',
        alt: 'Kapster helpt klant afrekenen met pinterminal aan de balie',
      },
    ],
    faqs: [
      {
        question: 'Kan ik behandelingen én producten afrekenen?',
        answer: 'Ja. Beide staan op hetzelfde kassascherm. Producten kun je tikken of scannen.',
      },
      {
        question: 'Kan ik voorraad van shampoo en merken bijhouden?',
        answer: 'Ja. Voorraad, minimumvoorraad, inkoop en goederenontvangst zitten in het systeem.',
      },
      {
        question: 'Kan ik een klantenkaart gebruiken in de salon?',
        answer: 'Ja. Klantenkaart, winkelpas en punten horen bij de licentie.',
      },
      {
        question: 'Zit er een kappersagenda in Vysion?',
        answer:
          'Ja. Afspraken en planning zitten in hetzelfde systeem als je kassa: klanten boeken online, jij ziet wie wanneer komt in je overzicht, gekoppeld aan je team. Geen apart abonnement voor een losse agenda-app.',
      },
    ],
    breadcrumbLabel: 'Kapper',
    related: relatedExcept(WINKEL_RELATED, '/sectoren/kapper'),
    hubHref: '/winkel',
    hubLabel: 'Bekijk het complete kassasysteem voor winkels & retail',
    demoHref: '/winkel#contact',
    ogImage: '/images/sectoren/kapper-hero.jpg',
  },
  nachtwinkel: {
    slug: 'nachtwinkel',
    path: '/sectoren/nachtwinkel',
    cluster: 'winkel',
    title: `Kassasysteem voor nachtwinkels | ${BRAND}`,
    description:
      'Kassasysteem voor nachtwinkels en buurtwinkels: barcodeverkoop, voorraad, inkoop, rapporten en hardware in één licentie.',
    h1: 'Kassasysteem voor jouw nachtwinkel',
    eyebrow: 'Nachtwinkel & buurtwinkel',
    intro:
      'Veel SKU’s, een scanner en weinig tijd per klant. Vysion is een kassasysteem voor nachtwinkels: scannen, stock en inkoop in één scherm — ook als het later wordt.',
    bullets: [
      'Barcode scannen en snel afrekenen.',
      'Voorraad en minimumvoorraad per artikel.',
      'Werkt door als het internet even wegvalt; daarna synchroniseert het systeem.',
    ],
    heroImage: {
      src: '/images/sectoren/nachtwinkel-hero.jpg',
      alt: 'Verlichte toonbank en klanten op straat in de avond — typisch voor een nachtwinkel',
    },
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een nachtwinkel',
        body: [
          'Een nachtwinkel of buurtwinkel leeft van scannen, niet van een restaurantmenu. Vysion koppelt kassaverkoop aan voorraad, leveranciers en rapporten.',
          'Offline blijft de kassa werken; als je weer online bent, werkt alles zich bij. Hardware en software in één licentie. 14 dagen gratis proberen.',
        ],
      },
      {
        id: 'verkoop',
        title: 'Scannen en afrekenen',
        body: [
          'Bestaande barcodes gebruik je. Nieuwe etiketten print je zelf. Op het klantenscherm ziet de klant de prijs. Digitale bon of factuur per e-mail.',
        ],
      },
      {
        id: 'voorraad',
        title: 'Voorraad en inkoop',
        body: [
          'Actuele voorraad, minimumvoorraad, inventaris, productimport, leveranciers, bestelbonnen en goederenontvangst. Een artikel kun je via je telefoon scannen of fotograferen.',
        ],
      },
      {
        id: 'klanten',
        title: 'Klantenkaart en rapporten',
        body: [
          'Klantenkaart en punten voor vaste buurtklanten. Rapportages en populaire artikelen tonen wat ’s avonds uit de rekken gaat.',
        ],
      },
    ],
    hardware:
      'Premium licentie: Elo-touchscreen, barcodescanner, kassalade en Epson-bonprinter. Zonder hardware gebruik je je eigen scherm.',
    hardwareImages: [
      { src: '/images/hardware/hardware-tf30-kassa.png', alt: 'Elo-touchscreen kassa', contain: true },
      { src: '/images/hardware/hardware-barcode-scanner.png', alt: 'Barcodescanner', contain: true },
    ],
    faqs: [
      {
        question: 'Kan ik met een barcodescanner werken?',
        answer: 'Ja. Scannen aan de kassa, bestaande codes of zelf geprinte etiketten.',
      },
      {
        question: 'Blijft de kassa werken zonder internet?',
        answer: 'Ja. De kassa werkt door offline. Zodra je weer online bent, synchroniseert het systeem.',
      },
      {
        question: 'Kan ik honderden artikelen in voorraad houden?',
        answer: 'Ja. Voorraad, import, inkoop en goederenontvangst horen bij de licentie.',
      },
      {
        question: 'Kan ik mijn kassa laten aanpassen?',
        answer:
          'Jazeker. Je kunt je kassa gratis laten aanpassen naar jouw smaak. Heb je een module nodig die echt bij jouw zaak past? Geen probleem — wij bouwen die gratis in je kassa.',
      },
    ],
    breadcrumbLabel: 'Nachtwinkel',
    related: relatedExcept(WINKEL_RELATED, '/sectoren/nachtwinkel'),
    hubHref: '/winkel',
    hubLabel: 'Bekijk het complete kassasysteem voor winkels & retail',
    demoHref: '/winkel#contact',
    ogImage: '/images/sectoren/nachtwinkel-hero.jpg',
  },
  cafe: {
    slug: 'cafe',
    path: '/sectoren/cafe',
    cluster: 'horeca',
    title: `Kassasysteem voor cafés | ${BRAND}`,
    description:
      'Kassasysteem voor cafés: barverkoop, tafels, reservaties, keukenscherm, online bestellen en personeel in één licentie.',
    h1: 'Kassasysteem voor jouw café',
    eyebrow: 'Café & bar',
    intro:
      'Drank aan de bar, een terras en soms een keuken. Vysion is een kassasysteem voor cafés: kassa, tafels, reservaties en online bestellen in één platform.',
    bullets: [
      'Snel tikken aan de bar, met tafel indien je zitdiensten hebt.',
      'Reservaties en walk-in in hetzelfde systeem.',
      'Keukenscherm als je ook eten uitstuurt.',
    ],
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een café',
        body: [
          'Een café is geen kledingrek en geen frituurrij. Je wilt dranken snel raken, een tafel openen als iemand blijft zitten, en geen vijf losse apps voor reservatie, bestellen en kassa.',
          'Vysion koppelt kassa, online bestelsysteem, reservaties, keukenschermen, personeel, website, rapporten en bedrijfsanalyse. 14 dagen gratis proberen.',
        ],
      },
      {
        id: 'bar',
        title: 'Bar, terras en tafels',
        body: [
          'Aan de toog tik je dranken. Voor het terras of de zaal open je een tafel. Afrekenen gebeurt wanneer de ronde klaar is, met zicht op het klantenscherm.',
        ],
      },
      {
        id: 'keuken',
        title: 'Eten, keuken en bestellingen',
        body: [
          'Serveer je toast of een dagschotel, dan gaat de bestelling naar het keukenscherm. Online bestellen en je eigen website horen bij de licentie. WhatsApp-bestellingen zijn beschikbaar als je die module gebruikt.',
        ],
      },
      {
        id: 'reservaties',
        title: 'Reservaties',
        body: [
          'Reservaties, walk-in en een plattegrond zitten in het reservatiesysteem. Geen aparte reservatie-app naast de kassa.',
        ],
      },
      {
        id: 'team',
        title: 'Personeel en rapportage',
        body: [
          'In- en uitklokken, rapporten en bedrijfsanalyse. Zo zie je baromzet versus keuken, zonder een extra tool.',
        ],
      },
    ],
    hardware:
      'Premium licentie: Elo-touchscreen, Epson-printers, kassalade. Keukenschermen en handhelds als je die inzet. Zonder hardware gebruik je je eigen scherm.',
    hardwareImages: [
      { src: '/images/hardware/hardware-tf30-kassa.png', alt: 'Elo-touchscreen kassa', contain: true },
    ],
    faqs: [
      {
        question: 'Kan ik tafels openen in een café?',
        answer: 'Ja. Je opent een tafel of rekent meteen af aan de bar, in hetzelfde kassasysteem.',
      },
      {
        question: 'Zit er een reservatiesysteem bij?',
        answer: 'Ja. Reservaties, walk-in en plattegrond horen bij het platform.',
      },
      {
        question: 'Kan de keuken meelezen?',
        answer: 'Ja. Bestellingen kun je naar keukenschermen sturen als je eten serveert.',
      },
      {
        question: 'Kan ik online laten bestellen?',
        answer: 'Ja. Online bestelsysteem en een eigen website zitten in de licentie.',
      },
    ],
    breadcrumbLabel: 'Café',
    related: relatedExcept(HORECA_RELATED, '/sectoren/cafe'),
    hubHref: '/',
    hubLabel: 'Bekijk het Vysion-platform voor horeca',
    demoHref: '/#contact',
    ogImage: '/images/hardware/hardware-tf30-kassa.png',
  },
  frituur: {
    slug: 'frituur',
    path: '/sectoren/frituur',
    cluster: 'horeca',
    title: `Kassasysteem voor frituren | ${BRAND}`,
    description:
      'Kassasysteem voor frituren: snel tikken, sauzen als extra, hier opeten of afhaal, keukenscherm en online bestellen in één licentie.',
    h1: 'Kassasysteem voor jouw frituur',
    eyebrow: 'Frituur',
    intro:
      'Rijen, sauzen en “hier opeten of afhaal”. Vysion is een kassasysteem voor frituren: producttegels, extra’s, keukenbon en online bestellen in één flow.',
    bullets: [
      'Frieten en snacks als tegels, sauzen als extra’s.',
      'Hier opeten of meenemen, met ticket naar de keuken.',
      'Eigen bestelwebsite, zoals je die bij Vysion al ziet bij frituren.',
    ],
    heroImage: {
      src: '/images/kassa-platform-3.png',
      alt: 'Kassascherm van een frituur met frietproducten en hier-opeten',
      contain: true,
    },
    extraImage: {
      src: '/images/online-order-platform-1.png',
      alt: 'Online bestelpagina van een frituur',
    },
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een frituur',
        body: [
          'In een frituur telt elke seconde. Je wilt een kleine friet, een extra saus en “hier opeten” zonder te verdwalen in menu’s. Vysion toont dat op één kassascherm, gekoppeld aan keuken en online bestellen.',
          'Geen aparte snackbarpagina: dezelfde flow dekt frituur en snackbar. 14 dagen gratis proberen.',
        ],
      },
      {
        id: 'extras',
        title: 'Producten, sauzen en extra’s',
        body: [
          'Frieten, snacks en menu’s staan als tegels. Sauzen en extra’s voeg je toe per regel — zoals op het echte Vysion-frituurscherm. Minder tikken, minder fouten in de piek.',
        ],
      },
      {
        id: 'flow',
        title: 'Hier opeten, afhaal en keuken',
        body: [
          'Je kiest hier opeten of meenemen. De keuken krijgt het ticket op het keukenscherm. Aan de kassa blijft het totaal en de betaling zichtbaar, inclusief gesplitst betalen.',
        ],
      },
      {
        id: 'online',
        title: 'Online bestellen',
        body: [
          'Klanten bestellen via je eigen site: openingstijden, wachttijd en “bestel nu”. WhatsApp-bestellingen als je die module gebruikt. Geen aparte commissie-app verplicht.',
        ],
      },
      {
        id: 'team',
        title: 'Personeel en rapportage',
        body: [
          'In- en uitklokken, rapporten, populaire items en bedrijfsanalyse. Zo zie je welke snacks de avond dragen.',
        ],
      },
    ],
    hardware:
      'Premium licentie: Elo-touchscreen, Epson-printers, kassalade en keukenschermen. Zonder hardware gebruik je je eigen scherm.',
    hardwareImages: [
      { src: '/images/hardware/hardware-tf30-kassa.png', alt: 'Elo-touchscreen kassa', contain: true },
    ],
    faqs: [
      {
        question: 'Kan ik sauzen als extra toevoegen?',
        answer: 'Ja. Extra’s en sauzen horen bij de productregel op het kassascherm.',
      },
      {
        question: 'Kan ik kiezen tussen hier opeten en afhaal?',
        answer: 'Ja. Dat zit in de kassaflow, samen met het ticket naar de keuken.',
      },
      {
        question: 'Kan ik online laten bestellen?',
        answer: 'Ja. Een eigen bestelwebsite hoort bij de licentie.',
      },
      {
        question: 'Is er een aparte pagina voor snackbar?',
        answer: 'Nee. Frituur en snackbar delen dezelfde zoekintentie. Deze pagina dekt beide.',
      },
    ],
    breadcrumbLabel: 'Frituur',
    related: relatedExcept(HORECA_RELATED, '/sectoren/frituur'),
    hubHref: '/',
    hubLabel: 'Bekijk het Vysion-platform voor horeca',
    demoHref: '/#contact',
    ogImage: '/images/kassa-platform-3.png',
  },
  kebab: {
    slug: 'kebab',
    path: '/sectoren/kebab',
    cluster: 'horeca',
    title: `Kassasysteem voor kebabzaken | ${BRAND}`,
    description:
      'Kassasysteem voor kebabzaken: toonbankverkoop, extra’s, keukenscherm, afhaal en online bestellen in één licentie.',
    h1: 'Kassasysteem voor jouw kebabzaak',
    eyebrow: 'Kebabzaak',
    intro:
      'Dürüm, schotel, extra saus, laat op de avond. Vysion is een kassasysteem voor kebabzaken: snel tikken, keukenticket en online bestellen zonder extra app.',
    bullets: [
      'Menu’s en extra’s op het kassascherm.',
      'Ticket naar de keuken, afhaal of hier opeten.',
      'Eigen online bestelpagina in de licentie.',
    ],
    heroImage: {
      src: '/images/hardware/hardware-tf30-kassa.png',
      alt: 'Elo-touchscreen kassa voor de toonbank',
      contain: true,
    },
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een kebabzaak',
        body: [
          'Een kebabzaak lijkt op frituur in tempo, maar het menu is anders: broodsoort, vlees, groenten, saus. Vysion laat je die extra’s per regel zetten en stuurt de keuken een duidelijk ticket.',
          'Geen aparte broodjesbar-pagina met dezelfde tekst. Broodjes naast döner reken je op dezelfde kassa. 14 dagen gratis proberen.',
        ],
      },
      {
        id: 'toonbank',
        title: 'Toonbank en extra’s',
        body: [
          'Tik het menu aan, voeg extra’s toe, kies hier opeten of meenemen. Betalen aan de kassa, met klantenscherm.',
        ],
      },
      {
        id: 'keuken',
        title: 'Keuken en online',
        body: [
          'Keukenschermen tonen wat erop moet. Online bestellen en je eigen website horen bij de licentie. WhatsApp-bestellingen als je die module gebruikt.',
        ],
      },
      {
        id: 'team',
        title: 'Personeel en rapportage',
        body: [
          'In- en uitklokken, rapporten en populaire items. Handig na een late shift: wat ging eruit, wat moet je vullen.',
        ],
      },
    ],
    hardware:
      'Premium licentie: Elo-touchscreen, Epson-printers, kassalade en keukenschermen. Zonder hardware gebruik je je eigen scherm.',
    hardwareImages: [
      { src: '/images/hardware/hardware-tf30-kassa.png', alt: 'Elo-touchscreen kassa', contain: true },
    ],
    faqs: [
      {
        question: 'Kan ik extra’s per dürüm of schotel zetten?',
        answer: 'Ja. Extra’s horen bij de productregel, zoals op de rest van de Vysion-kassa.',
      },
      {
        question: 'Krijgt de keuken een ticket?',
        answer: 'Ja. Bestellingen gaan naar het keukenscherm.',
      },
      {
        question: 'Kan ik online laten bestellen?',
        answer: 'Ja. Eigen bestelwebsite in de licentie, plus optioneel WhatsApp.',
      },
      {
        question: 'Is dit hetzelfde als de frituurpagina?',
        answer:
          'De kassa is hetzelfde platform, de inhoud niet. Hier gaat het om kebab/döner-toonbank, niet om het friet-sausenscherm.',
      },
    ],
    breadcrumbLabel: 'Kebabzaak',
    related: relatedExcept(HORECA_RELATED, '/sectoren/kebab'),
    hubHref: '/',
    hubLabel: 'Bekijk het Vysion-platform voor horeca',
    demoHref: '/#contact',
    ogImage: '/images/hardware/hardware-tf30-kassa.png',
  },
  restaurant: {
    slug: 'restaurant',
    path: '/sectoren/restaurant',
    cluster: 'horeca',
    title: `Kassasysteem voor restaurants | ${BRAND}`,
    description:
      'Kassasysteem voor restaurants en brasseries: tafels, keukenschermen, reservaties, online bestellen en personeel in één licentie.',
    h1: 'Kassasysteem voor jouw restaurant',
    eyebrow: 'Restaurant & brasserie',
    intro:
      'Tafels, gangen en een volle zaal. Vysion is een kassasysteem voor restaurants: open tafel, stuur de keuken, neem reservaties op — zonder een tweede platform.',
    bullets: [
      'Tafels openen, bijbestellen, afrekenen.',
      'Keukenschermen en reservaties in hetzelfde systeem.',
      'Brasserie en sit-down pizzeria gebruiken dezelfde flow — geen dubbele landingspagina.',
    ],
    sections: [
      {
        id: 'waarom',
        title: 'Waarom Vysion voor een restaurant',
        body: [
          'Een restaurant heeft tafels, reservaties en een keuken. Dat is een andere zoekintentie dan café-toog of frituurrij. Vysion houdt kassa, reservaties, keukenschermen, online bestellen, website, personeel en rapporten bij elkaar.',
          'Brasserie overlapt hiermee: zelfde tafels en keuken. Daarom geen aparte brasseriepagina. 14 dagen gratis proberen.',
        ],
      },
      {
        id: 'tafels',
        title: 'Tafels en service',
        body: [
          'Je opent een tafel, voegt gangen toe en rekent af wanneer de tafel klaar is. Gesplitst betalen zit in de kassa. Het klantenscherm toont het bedrag.',
        ],
      },
      {
        id: 'keuken',
        title: 'Keuken en bestellingen',
        body: [
          'Bestellingen gaan naar keukenschermen. Handhelds als je die inzet. Online bestellen en je eigen website horen bij de licentie.',
        ],
      },
      {
        id: 'reservaties',
        title: 'Reservaties en walk-in',
        body: [
          'Reservaties, walk-in, wachtlijst en plattegrond zitten in het reservatiesysteem — gekoppeld aan dezelfde zaak als de kassa.',
        ],
      },
      {
        id: 'team',
        title: 'Personeel en rapportage',
        body: [
          'In- en uitklokken, rapporten, populaire gerechten en bedrijfsanalyse. Geen extra tool voor de avondrapporten.',
        ],
      },
    ],
    hardware:
      'Premium licentie: Elo-touchscreen, Epson-printers, kassalade, keukenschermen en handhelds. Tafelbestelkiosk bestaat in het horeca-aanbod als je die gebruikt. Zonder hardware: eigen scherm.',
    hardwareImages: [
      { src: '/images/hardware/hardware-tf30-kassa.png', alt: 'Elo-touchscreen kassa', contain: true },
    ],
    faqs: [
      {
        question: 'Kan ik tafels beheren?',
        answer: 'Ja. Je opent tafels, voegt toe en rekent af in het kassasysteem.',
      },
      {
        question: 'Zit er een reservatiesysteem bij?',
        answer: 'Ja. Reservaties, walk-in, wachtlijst en plattegrond horen bij het platform.',
      },
      {
        question: 'Krijgt de keuken de bestelling?',
        answer: 'Ja. Via keukenschermen, in hetzelfde systeem.',
      },
      {
        question: 'Waarom geen aparte pagina voor brasserie of pizzeria?',
        answer:
          'Die zaken gebruiken dezelfde tafel- en keukenflow. Eén sterke restaurantpagina voorkomt dubbele, dunne landings.',
      },
    ],
    breadcrumbLabel: 'Restaurant',
    related: relatedExcept(HORECA_RELATED, '/sectoren/restaurant'),
    hubHref: '/',
    hubLabel: 'Bekijk het Vysion-platform voor horeca',
    demoHref: '/#contact',
    ogImage: '/images/hardware/hardware-tf30-kassa.png',
  },
}

export const SECTOR_LANDING_SLUGS = Object.keys(SECTOR_LANDINGS)

export const WINKEL_SECTOR_PATHS = Object.values(SECTOR_LANDINGS)
  .filter((item) => item.cluster === 'winkel')
  .map((item) => item.path)
  .concat('/sectoren/kledingwinkel')

export const HORECA_SECTOR_LINKS = HORECA_RELATED
export const WINKEL_SECTOR_LINKS = WINKEL_RELATED

export function getSectorLanding(slug: string): SectorLanding {
  const landing = SECTOR_LANDINGS[slug]
  if (!landing) {
    throw new Error(`Unknown sector landing: ${slug}`)
  }
  return landing
}

export function sectorLandingMetadata(slug: string): Metadata {
  const landing = getSectorLanding(slug)
  const url = `${VYSION_CANONICAL_ORIGIN}${landing.path}`
  return {
    title: { absolute: landing.title },
    description: landing.description,
    alternates: { canonical: landing.path },
    robots: { index: true, follow: true },
    openGraph: {
      title: landing.title,
      description: landing.description,
      type: 'website',
      locale: 'nl_BE',
      url,
      siteName: VYSION_BRAND_SITE_NAME,
      images: [{ url: landing.ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: landing.title,
      description: landing.description,
      images: [landing.ogImage],
    },
  }
}

export function sectorBreadcrumbs(landing: SectorLanding) {
  const mid =
    landing.cluster === 'winkel'
      ? { name: 'Winkels & retail', path: '/winkel' }
      : null
  const crumbs = [
    { name: 'Home', path: '/' },
    ...(mid ? [mid] : []),
    { name: landing.breadcrumbLabel, path: landing.path },
  ]
  return crumbs
}

export function sectorBreadcrumbJsonLd(landing: SectorLanding) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: sectorBreadcrumbs(landing).map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.path === '/' ? `${VYSION_CANONICAL_ORIGIN}/` : `${VYSION_CANONICAL_ORIGIN}${crumb.path}`,
    })),
  }
}

export function sectorFaqJsonLd(landing: SectorLanding) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: landing.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}
