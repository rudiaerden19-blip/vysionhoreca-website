import { MARKETING_FAQ_KASSA_AANPASSEN } from '@/lib/marketing-kassa-aanpassen-faq'
import { VYSION_BRAND_SITE_NAME, VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

export const KLEDINGWINKEL_PATH = '/sectoren/kledingwinkel' as const

export const KLEDINGWINKEL_H1 = 'Kassasysteem voor jouw kledingwinkel'

export const KLEDINGWINKEL_TITLE = `Kassasysteem voor kledingwinkels | ${VYSION_BRAND_SITE_NAME}`

export const KLEDINGWINKEL_DESCRIPTION =
  'Compleet kassasysteem voor kledingwinkels: maten en kleuren als varianten, barcodeverkoop, voorraad, retour en tegoedbon, klantenkaart en solden. Hardware en software in één licentie.'

export const KLEDINGWINKEL_OG_IMAGE = '/images/winkel/winkel-retour-tegoedbon-card.png'

export type KledingwinkelFaq = {
  question: string
  answer: string
}

export const KLEDINGWINKEL_FAQS: readonly KledingwinkelFaq[] = [
  {
    question: 'Kan ik maten en kleuren apart bijhouden?',
    answer:
      'Ja. Je maakt één artikel aan en voegt varianten toe, bijvoorbeeld maat S, M, L of XL en verschillende kleuren. De voorraad volg je per variant.',
  },
  {
    question: 'Kan iedere variant een eigen barcode hebben?',
    answer:
      'Ja. Elke maat-kleurcombinatie kan een eigen barcode krijgen. Je scant aan de kassa de juiste variant, of je print zelf etiketten.',
  },
  {
    question: 'Kan ik retouren en omruilingen verwerken?',
    answer:
      'Ja. Je verwerkt een retour of omruiling aan de kassa. Past een ander stuk niet, dan maak je meteen een tegoedbon aan.',
  },
  {
    question: 'Kan ik tegoedbonnen gebruiken?',
    answer:
      'Ja. Na een retour kun je een tegoedbon aanmaken. De klant gebruikt die later opnieuw in je winkel.',
  },
  {
    question: 'Kan ik mijn voorraad bijhouden?',
    answer:
      'Ja. Je ziet de actuele voorraad, zet een minimumvoorraad, doet een inventaris of stocktelling en verwerkt goederenontvangst. Producten importeer je in één keer.',
  },
  {
    question: 'Kan ik met een barcodescanner werken?',
    answer:
      'Ja. Je scant artikelen aan de kassa. Bestaande barcodes kun je gebruiken, of je print nieuwe etiketten voor je eigen varianten.',
  },
  {
    question: 'Kan ik klantenkaarten en punten gebruiken?',
    answer:
      'Ja. Klantenkaart, winkelpas en punten zitten in het systeem. Je herkent terugkerende klanten zonder extra software.',
  },
  {
    question: 'Kan ik producten importeren?',
    answer:
      'Ja. Je importeert producten in bulk. Een artikel kun je ook via je telefoon scannen of fotograferen om het sneller toe te voegen.',
  },
  {
    question: 'Kan ik leveranciers en bestellingen beheren?',
    answer:
      'Ja. Je beheert leveranciers, inkoop en bestelbonnen. Bij levering verwerk je de goederenontvangst, zodat de voorraad mee-updates.',
  },
  {
    question: 'Kan ik een webshop gebruiken?',
    answer:
      'Ja. Een eigen webshop hoort bij de licentie. Dezelfde producten en prijzen als in de winkel, zonder aparte commissie-app.',
  },
  {
    question: 'Kan ik een digitale kassabon versturen?',
    answer:
      'Ja. Je stuurt de kassabon of een factuur meteen per e-mail. Op het klantenscherm ziet de klant de prijs tijdens het afrekenen.',
  },
  MARKETING_FAQ_KASSA_AANPASSEN,
] as const

export const KLEDINGWINKEL_BREADCRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Winkels & retail', path: '/winkel' },
  { name: 'Kledingwinkel', path: KLEDINGWINKEL_PATH },
] as const

export function kledingwinkelCanonicalUrl(): string {
  return `${VYSION_CANONICAL_ORIGIN}${KLEDINGWINKEL_PATH}`
}

export function kledingwinkelBreadcrumbJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: KLEDINGWINKEL_BREADCRUMBS.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item:
        crumb.path === '/'
          ? `${VYSION_CANONICAL_ORIGIN}/`
          : `${VYSION_CANONICAL_ORIGIN}${crumb.path}`,
    })),
  }
}

export function kledingwinkelFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: KLEDINGWINKEL_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}
