/**
 * One-off patch: sectorPages (6 sectors + hardwareBeest block), all locales.
 * Run: node scripts/apply-sector-hardware-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const messagesDir = path.join(root, 'messages')

/** @type {Record<string, Record<string, unknown>>} */
const SECTOR_PAGES = {
  nl: {
    breadcrumb: 'Sectoren',
    hardwareBeest: {
      title: "Intel i5 dual-screen: 'Het Beest'",
      specProcessor: '🚀 Processor: Intel i5 Core (ongeëvenaarde snelheid)',
      specMemory: '🧠 Geheugen: 8 GB RAM + 128 GB SSD',
      specScreens: '🖥️ Schermen: 15" hoofdscherm + 11,5" klantendisplay',
      specLanguages: '🌍 Talen: 9 talen (o.a. Arabisch, Chinees, Japans)',
      specIncluded: '🖨️ Inclusief: ingebouwde printer + 5 rollen papier gratis',
      blackVariantTitle: 'Ook verkrijgbaar in zwart',
      demoCta: 'Vraag nu je gratis demo aan - Direct leverbaar uit onze winkel in België',
    },
    bakkerij: {
      h1: 'Snelste Kassasysteem voor Bakkers | i5 Kracht & 9 Talen | Vysion',
      intro:
        "Specifieke kassa-layout voor bakkers: Intel i5 (‘Het Beest’) voor pieksnelheid in de ochtend, 9 talen voor je team, en na 24 maanden is de hardware van jou — dé keuze als je een sterk kassasysteem België en Nederland zoekt.",
      body1:
        'Wil je de snelste kassa tijdens drukke brunches en weekenddrukte? Bij ons combineer je touchscreen POS, bonprinter en software die niet traag wordt. Kassa kopen of leasen wordt helder: één pakket, zonder verrassingen na installatie.',
      body2:
        'Vysion is gebouwd voor bakkers die marges en tempo willen houden. Onze deal met eigendom na 24 maanden maakt het verschil t.o.v. eindeloos huren — het kassasysteem België waar je op kunt bouwen.',
      imageAlt: 'Vysion kassa layout voor bakkerij',
      cta: 'Start gratis — 14 dagen proberen',
      ownership24: 'Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom.',
    },
    cafe: {
      h1: 'Horeca Kassa voor Cafés | i5 Dual-Screen & 9 Talen | Vysion',
      intro:
        'Café-ritme vraagt een razendsnelle kassa: i5-hardware (‘Het Beest’), 9 talen voor meertalig personeel en overzicht op je marge — de horeca kassa voor brasserie, koffiebar en lunchroom.',
      body1:
        'Ochtendrush of terrasweer: je wilt de snelste kassa aan de bar. Combineer zaal, takeaway en online bestellen in één flow — ideaal als kassasysteem België voor cafés met drukke pieken.',
      body2:
        'Minder tikken, minder fouten, meer bedieningen per uur. Probeer Vysion gratis en ervaar i5-kracht met duidelijke voorwaarden en eigendom na 24 maanden.',
      imageAlt: 'Vysion kassa layout voor café en brasserie',
      cta: 'Start gratis',
      ownership24: 'Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom.',
    },
    frituur: {
      h1: 'Frituur Kassa | Snelste i5 Checkout | Vysion',
      intro:
        'Frituurpieken en festivals: jouw kassa moet mee. Intel i5 (‘Het Beest’), dubbel scherm voor de klant, 9 talen voor je team — gebouwd voor drukte, olie en tempo.',
      body1:
        'Bestellen, sauzen, bijgerechten: alles vlot invoeren zonder vastlopers. Touchscreen POS, ingebouwde printer en online bestelplatform in één aanpak — dé frituur kassa voor België en Nederland.',
      body2:
        'Houd wachtrijen kort en marges strak. Start gratis, test in je zaak, en kies voor hardware die na 24 maanden van jou is.',
      imageAlt: 'Vysion kassa layout voor frituur en snackbar',
      cta: 'Start gratis',
      ownership24: 'Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom.',
    },
    kebab: {
      h1: 'Kebab & Broodjesbar Kassa | i5 Kracht | Vysion',
      intro:
        'Late-night druk en broodjes in het kwadraat: met i5-hardware (‘Het Beest’) en 9 talen blijft je team snel — de kassa voor kebab, döner en broodjesbar.',
      body1:
        'Combineer zaal, afhaal en bezorging zonder chaos. De snelste kassa-flow met duidelijke tickets en bonnen — kassasysteem België voor horeca met hoge doorzet.',
      body2:
        'Minder stress aan de toonbank, meer controle op omzet. Probeer gratis en ontdek waarom ondernemers kiezen voor i5 in plaats van traag materiaal.',
      imageAlt: 'Vysion kassa layout voor kebab en broodjesbar',
      cta: 'Start gratis',
      ownership24: 'Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom.',
    },
    kapper: {
      h1: 'Kassasysteem voor Kappers & Salons | Stijlvol & Snel | Vysion',
      intro:
        'Geef je salon de upgrade die het verdient: professionele i5-kassa (‘Het Beest’), eenvoudig afrekenen, 9 talen voor je team, en na 24 maanden is de hardware van jou.',
      body1:
        'In de stoel wil je geen wachtrij aan de balie. Met de snelste kassa-flow blijft je planning strak. Kassa kopen of leasen met duidelijke voorwaarden — het kassasysteem België en Nederland voor salons.',
      body2:
        'Combineer afspraken, producten en fooi in één overzicht. Probeer Vysion gratis en ontdek stijlvolle, snelle checkout met premium hardware.',
      imageAlt: 'Vysion kassa layout voor kapper en salon',
      cta: 'Start gratis',
      ownership24: 'Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom.',
    },
    retail: {
      h1: "Retail Kassa & Voorraadbeheer | Het i5 'Beest' voor Winkels | Vysion",
      intro:
        'Beheer je winkelvoorraad op krachtige i5-hardware (8 GB RAM), met touchscreen POS en gratis website-integratie — retail kassa die meegroeit met je zaak.',
      body1:
        'Wie een snelle retail kassa wil, combineert voorraad en verkoop in één scherm. Kassa kopen met zicht op marges en snelheid aan de kassa — dé keuze als kassasysteem België voor winkels.',
      body2:
        'Van barcode tot einddag: minder fouten, meer tempo. Eigendom na 24 maanden op premium hardware — stop met huren zonder voordeel.',
      imageAlt: 'Vysion kassa layout voor retail en winkel',
      cta: 'Start gratis',
      ownership24: 'Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom.',
    },
  },
  en: {
    breadcrumb: 'Sectors',
    hardwareBeest: {
      title: "Vysion i5 dual-screen: 'The Beast'",
      specProcessor: '🚀 Processor: Intel i5 Core (unmatched speed)',
      specMemory: '🧠 Memory: 8 GB RAM + 128 GB SSD',
      specScreens: '🖥️ Displays: 15" main screen + 11.5" customer display',
      specLanguages: '🌍 Languages: 9 languages (including Arabic, Chinese, Japanese)',
      specIncluded: '🖨️ Included: built-in printer + 5 free paper rolls',
      blackVariantTitle: 'Also available in black',
      demoCta: 'Request your free demo now — Ready for pickup from our store in Belgium',
    },
    bakkerij: {
      h1: 'Fastest POS for Bakeries | i5 Power & 9 Languages | Vysion',
      intro:
        "Bakery-focused checkout: Intel i5 ('The Beast') for morning rush speed, 9 languages for your team, and you own the hardware after 24 months — the POS Belgium and the Netherlands rely on.",
      body1:
        'Need the fastest checkout for busy brunch and weekend peaks? Touchscreen POS, receipt printer and software that stay responsive. Buying or leasing stays clear: one package, no install surprises.',
      body2:
        'Built for bakers who care about margin and pace. Owning hardware after 24 months beats renting forever — the Belgium POS you can grow on.',
      imageAlt: 'Vysion POS layout for bakery',
      cta: 'Start free — 14-day trial',
      ownership24: 'Stop renting. After 24 months, this i5 POS is 100% yours.',
    },
    cafe: {
      h1: 'Hospitality POS for Cafés | i5 Dual-Screen & 9 Languages | Vysion',
      intro:
        'Café pace demands a fast checkout: i5 hardware, 9 languages for multilingual crews, and margin insight — the hospitality POS for brasseries, coffee bars and lunch spots.',
      body1:
        'Morning rush or busy terrace: you want the fastest till. Combine dine-in, takeaway and online ordering in one flow — ideal as a Belgium POS for busy cafés.',
      body2:
        'Fewer taps, fewer errors, more covers per hour. Try Vysion free and feel i5 power with clear terms and ownership after 24 months.',
      imageAlt: 'Vysion POS layout for café and brasserie',
      cta: 'Start free',
      ownership24: 'Stop renting. After 24 months, this i5 POS is 100% yours.',
    },
    frituur: {
      h1: 'Chip Shop POS | Fastest i5 Checkout | Vysion',
      intro:
        'Chip shop peaks and events: your till must keep up. Intel i5, dual screen for customers, 9 languages for your team — built for heat, queues and speed.',
      body1:
        'Orders, sauces and sides without slowdowns. Touchscreen POS, built-in printer and online ordering in one stack — the chip shop POS for Belgium and the Netherlands.',
      body2:
        'Keep queues short and margins tight. Start free, test in your shop, and choose hardware you own after 24 months.',
      imageAlt: 'Vysion POS layout for chip shop and snack bar',
      cta: 'Start free',
      ownership24: 'Stop renting. After 24 months, this i5 POS is 100% yours.',
    },
    kebab: {
      h1: 'Kebab & Sandwich Bar POS | i5 Power | Vysion',
      intro:
        'Late-night volume and sandwiches at speed: i5 hardware and 9 languages keep your crew fast — the POS for kebab, döner and sandwich bars.',
      body1:
        'Combine dine-in, pickup and delivery without chaos. Fast checkout with clear tickets and receipts — Belgium hospitality POS for high throughput.',
      body2:
        'Less stress at the counter, more control on revenue. Try free and see why operators pick i5 over sluggish kit.',
      imageAlt: 'Vysion POS layout for kebab and sandwich bar',
      cta: 'Start free',
      ownership24: 'Stop renting. After 24 months, this i5 POS is 100% yours.',
    },
    kapper: {
      h1: 'POS for Hair Salons | Stylish & Fast | Vysion',
      intro:
        'Give your salon the upgrade: professional i5 POS, smooth payments, 9 languages for your team, and you own the hardware after 24 months.',
      body1:
        'No queues at the desk while chairs are full. The fastest checkout flow keeps your day on track. Buy or lease with clear terms — Belgium & Netherlands salons.',
      body2:
        'Combine appointments, retail and tips in one view. Try Vysion free and discover stylish, fast checkout with premium hardware.',
      imageAlt: 'Vysion POS layout for hair salon',
      cta: 'Start free',
      ownership24: 'Stop renting. After 24 months, this i5 POS is 100% yours.',
    },
    retail: {
      h1: "Retail POS & Stock Control | The i5 'Beast' for Shops | Vysion",
      intro:
        'Run stock on powerful i5 hardware (8 GB RAM), touchscreen POS and free website integration — retail checkout that scales with you.',
      body1:
        'Want a fast retail POS? Merge stock and sales on one screen. Buying a POS with margin insight and queue speed — the Belgium retail system for shops.',
      body2:
        'From barcode to closing: fewer errors, more speed. Own premium hardware after 24 months — stop renting without upside.',
      imageAlt: 'Vysion POS layout for retail and shops',
      cta: 'Start free',
      ownership24: 'Stop renting. After 24 months, this i5 POS is 100% yours.',
    },
  },
  de: {
    breadcrumb: 'Branchen',
    hardwareBeest: {
      title: "Vysion i5 Dual-Screen: 'Das Biest'",
      specProcessor: '🚀 Prozessor: Intel i5 Core (unglaubliche Geschwindigkeit)',
      specMemory: '🧠 Speicher: 8 GB RAM + 128 GB SSD',
      specScreens: '🖥️ Displays: 15" Hauptdisplay + 11,5" Kundendisplay',
      specLanguages: '🌍 Sprachen: 9 Sprachen (u. a. Arabisch, Chinesisch, Japanisch)',
      specIncluded: '🖨️ Inklusive: eingebauter Drucker + 5 gratis Papierrollen',
      blackVariantTitle: 'Ebenfalls in Schwarz erhältlich',
      demoCta: 'Jetzt kostenlose Demo anfragen — Sofort abholbar in unserem Laden in Belgien',
    },
    bakkerij: {
      h1: 'Schnellstes Kassensystem für Bäckereien | i5 & 9 Sprachen | Vysion',
      intro:
        'Kassenlayout für Bäcker: Intel i5 für Morgenspitzen, 9 Sprachen fürs Team, nach 24 Monaten gehört die Hardware Ihnen — das Kassensystem für Belgien und die Niederlande.',
      body1:
        'Sie brauchen die schnellste Kasse bei Brunch und Wochenendstress? Touchscreen-POS, Bonprinter und Software, die mithält. Kaufen oder leasen: ein Paket ohne Überraschungen.',
      body2:
        'Für Bäcker, die Marge und Tempo wollen. Eigentum nach 24 Monaten schlägt endloses Mieten — die belgische Kasse zum Wachsen.',
      imageAlt: 'Vysion Kassenlayout für Bäckerei',
      cta: 'Kostenlos starten — 14 Tage testen',
      ownership24: 'Schluss mit Mieten. Nach 24 Monaten ist diese i5-Kasse zu 100 % Ihr Eigentum.',
    },
    cafe: {
      h1: 'Gastronomie-Kasse für Cafés | i5 Dual-Screen & 9 Sprachen | Vysion',
      intro:
        'Café-Takt verlangt eine schnelle Kasse: i5-Hardware, 9 Sprachen für mehrsprachige Teams, Margen im Blick — die Gastro-Kasse für Brasserie, Coffee-Shop und Lunch.',
      body1:
        'Morgenstress oder Terrasse: Sie wollen die schnellste Theke. Zusammen mit Abholung und Online-Bestellung — ideal als belgisches Kassensystem für Cafés.',
      body2:
        'Weniger Tippen, weniger Fehler, mehr Umsatz pro Stunde. Vysion kostenlos testen — i5-Leistung mit klaren Konditionen und Eigentum nach 24 Monaten.',
      imageAlt: 'Vysion Kassenlayout für Café und Brasserie',
      cta: 'Kostenlos starten',
      ownership24: 'Schluss mit Mieten. Nach 24 Monaten ist diese i5-Kasse zu 100 % Ihr Eigentum.',
    },
    frituur: {
      h1: 'Imbiss-Kasse | Schnellste i5-Kasse | Vysion',
      intro:
        'Imbiss-Spitzen und Events: Ihre Kasse muss mithalten. Intel i5, Doppeldisplay für Gäste, 9 Sprachen fürs Team — für Stress, Öl und Tempo gebaut.',
      body1:
        'Bestellungen, Soßen und Beilagen ohne Hänger. Touchscreen-POS, eingebauter Drucker und Online-Bestellung — die Imbiss-Kasse für Belgien und die Niederlande.',
      body2:
        'Kurze Schlangen, straffe Margen. Kostenlos starten, in Ihrem Laden testen, Hardware nach 24 Monaten besitzen.',
      imageAlt: 'Vysion Kassenlayout für Imbiss und Snack-Bar',
      cta: 'Kostenlos starten',
      ownership24: 'Schluss mit Mieten. Nach 24 Monaten ist diese i5-Kasse zu 100 % Ihr Eigentum.',
    },
    kebab: {
      h1: 'Kebab- & Sandwichbar-Kasse | i5 Power | Vysion',
      intro:
        'Spätschicht und hohe Stückzahlen: i5-Hardware und 9 Sprachen halten Ihr Team schnell — die Kasse für Kebab, Döner und Sandwichbars.',
      body1:
        'Gastraum, Abholung und Lieferung ohne Chaos. Schnellster Kassenfluss mit klaren Tickets — Gastro-Kasse Belgien für hohen Durchsatz.',
      body2:
        'Weniger Stress an der Theke, mehr Kontrolle über Umsatz. Kostenlos testen und sehen, warum Betreiber i5 wählen.',
      imageAlt: 'Vysion Kassenlayout für Kebab und Sandwichbar',
      cta: 'Kostenlos starten',
      ownership24: 'Schluss mit Mieten. Nach 24 Monaten ist diese i5-Kasse zu 100 % Ihr Eigentum.',
    },
    kapper: {
      h1: 'Kassensystem für Friseure & Salons | Stilvoll & schnell | Vysion',
      intro:
        'Upgrade für Ihren Salon: professionelle i5-Kasse, reibungslose Zahlungen, 9 Sprachen fürs Team, nach 24 Monaten gehört die Hardware Ihnen.',
      body1:
        'Keine Schlange an der Kasse bei vollen Stühlen. Der schnellste Checkout hält den Tag im Plan — Belgien & Niederlande Salons.',
      body2:
        'Termine, Verkauf und Trinkgeld in einem Überblick. Vysion kostenlos testen — stilvoller Checkout mit Premium-Hardware.',
      imageAlt: 'Vysion Kassenlayout für Friseursalon',
      cta: 'Kostenlos starten',
      ownership24: 'Schluss mit Mieten. Nach 24 Monaten ist diese i5-Kasse zu 100 % Ihr Eigentum.',
    },
    retail: {
      h1: "Retail-Kasse & Lager | Das i5 'Biest' für Shops | Vysion",
      intro:
        'Lagerverwaltung auf starker i5-Hardware (8 GB RAM), Touchscreen-POS und kostenlose Website-Integration — Retail-Kasse, die mitwächst.',
      body1:
        'Schnelle Retail-Kasse: Lager und Verkauf auf einem Bildschirm. Kasse kaufen mit Margen- und Tempo-Fokus — belgisches System für Shops.',
      body2:
        'Vom Barcode bis Tagesabschluss: weniger Fehler, mehr Tempo. Premium-Hardware nach 24 Monaten besitzen — ohne nutzloses Mieten.',
      imageAlt: 'Vysion Kassenlayout für Retail und Shop',
      cta: 'Kostenlos starten',
      ownership24: 'Schluss mit Mieten. Nach 24 Monaten ist diese i5-Kasse zu 100 % Ihr Eigentum.',
    },
  },
  fr: {
    breadcrumb: 'Secteurs',
    hardwareBeest: {
      title: "Vysion i5 double écran : « La Bête »",
      specProcessor: '🚀 Processeur : Intel i5 Core (vitesse inégalée)',
      specMemory: '🧠 Mémoire : 8 Go RAM + 128 Go SSD',
      specScreens: '🖥️ Écrans : 15" principal + 11,5" client',
      specLanguages: '🌍 Langues : 9 langues (dont arabe, chinois, japonais)',
      specIncluded: '🖨️ Inclus : imprimante intégrée + 5 rouleaux de papier offerts',
      blackVariantTitle: 'Également en noir',
      demoCta: "Demandez votre démo gratuite — Retrait immédiat dans notre magasin en Belgique",
    },
    bakkerij: {
      h1: 'Caisse la plus rapide pour boulangers | i5 & 9 langues | Vysion',
      intro:
        'Mise en caisse boulangerie : Intel i5 pour les pics du matin, 9 langues, propriété du matériel après 24 mois — le système de caisse Belgique et Pays-Bas.',
      body1:
        'Brunch chargé ou week-end : POS tactile, imprimante, logiciel réactif. Acheter ou louer : un forfait clair, sans mauvaises surprises.',
      body2:
        'Pour les boulangers qui veulent marge et rythme. Propriété après 24 mois plutôt que location sans fin — la caisse belge pour grandir.',
      imageAlt: 'Mise en caisse Vysion pour boulangerie',
      cta: 'Commencer gratuitement — essai 14 jours',
      ownership24: 'Arrêtez de louer. Après 24 mois, cette caisse i5 est 100 % à vous.',
    },
    cafe: {
      h1: 'Caisse restauration pour cafés | i5 double écran & 9 langues | Vysion',
      intro:
        'Rythme café = caisse rapide : matériel i5, 9 langues pour équipes multilingues, vision des marges — la caisse pour brasserie, coffee shop et déjeuner.',
      body1:
        'Rush du matin ou terrasse : la caisse la plus rapide au comptoir. Salle, à emporter et commande en ligne — idéal en Belgique pour cafés chargés.',
      body2:
        'Moins de saisies, moins d’erreurs, plus de couverts. Essayez Vysion gratuitement — puissance i5 et propriété après 24 mois.',
      imageAlt: 'Mise en caisse Vysion pour café et brasserie',
      cta: 'Commencer gratuitement',
      ownership24: 'Arrêtez de louer. Après 24 mois, cette caisse i5 est 100 % à vous.',
    },
    frituur: {
      h1: 'Caisse friterie | Checkout i5 le plus rapide | Vysion',
      intro:
        'Pics friterie et événements : votre caisse doit suivre. Intel i5, double écran client, 9 langues — pour la file, l’huile et le tempo.',
      body1:
        'Commandes, sauces et accompagnements sans ralentissement. POS tactile, imprimante intégrée et commande en ligne — la caisse friterie Belgique & Pays-Bas.',
      body2:
        'Files courtes, marges serrées. Démarrez gratuitement, testez en boutique, matériel à vous après 24 mois.',
      imageAlt: 'Mise en caisse Vysion pour friterie et snack',
      cta: 'Commencer gratuitement',
      ownership24: 'Arrêtez de louer. Après 24 mois, cette caisse i5 est 100 % à vous.',
    },
    kebab: {
      h1: 'Caisse kebab & sandwicherie | Puissance i5 | Vysion',
      intro:
        'Soirées chargées et sandwichs à la chaîne : i5 et 9 langues gardent l’équipe rapide — la caisse kebab, döner et sandwicherie.',
      body1:
        'Salle, à emporter et livraison sans chaos. Flux de caisse rapide avec tickets clairs — système Belgique pour fort débit.',
      body2:
        'Moins de stress au comptoir, plus de contrôle sur le CA. Essayez gratuitement et voyez pourquoi les pros choisissent l’i5.',
      imageAlt: 'Mise en caisse Vysion pour kebab et sandwicherie',
      cta: 'Commencer gratuitement',
      ownership24: 'Arrêtez de louer. Après 24 mois, cette caisse i5 est 100 % à vous.',
    },
    kapper: {
      h1: 'Caisse salons de coiffure | Élégant & rapide | Vysion',
      intro:
        'La caisse pro i5, paiements fluides, 9 langues pour l’équipe, propriété du matériel après 24 mois — l’upgrade pour votre salon.',
      body1:
        'Pas de file à l’accueil quand les fauteuils sont pleins. Le flux le plus rapide garde la journée sous contrôle — salons Belgique & Pays-Bas.',
      body2:
        'Rendez-vous, vente et pourboires dans une vue. Essayez Vysion gratuitement — checkout premium.',
      imageAlt: 'Mise en caisse Vysion pour salon de coiffure',
      cta: 'Commencer gratuitement',
      ownership24: 'Arrêtez de louer. Après 24 mois, cette caisse i5 est 100 % à vous.',
    },
    retail: {
      h1: "Caisse retail & stock | L'i5 « Bête » pour magasins | Vysion",
      intro:
        'Stock sur i5 (8 Go RAM), POS tactile et intégration site gratuite — la caisse retail qui grandit avec vous.',
      body1:
        'Caisse retail rapide : stock et vente sur un écran. Achat de caisse avec marges et vitesse — système belge pour magasins.',
      body2:
        'Du code-barres à la clôture : moins d’erreurs, plus de rythme. Matériel premium à vous après 24 mois — fini la location sans gain.',
      imageAlt: 'Mise en caisse Vysion pour retail et magasin',
      cta: 'Commencer gratuitement',
      ownership24: 'Arrêtez de louer. Après 24 mois, cette caisse i5 est 100 % à vous.',
    },
  },
  es: {
    breadcrumb: 'Sectores',
    hardwareBeest: {
      title: "Vysion i5 doble pantalla: 'La Bestia'",
      specProcessor: '🚀 Procesador: Intel i5 Core (velocidad sin igual)',
      specMemory: '🧠 Memoria: 8 GB RAM + 128 GB SSD',
      specScreens: '🖥️ Pantallas: 15" principal + 11,5" cliente',
      specLanguages: '🌍 Idiomas: 9 idiomas (incl. árabe, chino, japonés)',
      specIncluded: '🖨️ Incluye: impresora integrada + 5 rollos de papel gratis',
      blackVariantTitle: 'También en negro',
      demoCta: 'Pide tu demo gratis — Listo para recoger en nuestra tienda en Bélgica',
    },
    bakkerij: {
      h1: 'TPV más rápido para panaderías | i5 y 9 idiomas | Vysion',
      intro:
        'Caja pensada para panadería: Intel i5 para el pico matinal, 9 idiomas para el equipo, propiedad del hardware a los 24 meses — el TPV Bélgica y Países Bajos.',
      body1:
        '¿Brunch o fin de semana a tope? TPV táctil, impresora y software ágil. Comprar o alquilar: un paquete claro, sin sorpresas.',
      body2:
        'Para panaderos que cuidan margen y ritmo. Propiedad a los 24 meses frente a alquilar sin fin — el TPV belga para crecer.',
      imageAlt: 'Layout Vysion TPV para panadería',
      cta: 'Empezar gratis — prueba 14 días',
      ownership24: 'Deja de alquilar. A los 24 meses, este TPV i5 es 100 % tuyo.',
    },
    cafe: {
      h1: 'TPV hostelería para cafeterías | i5 doble pantalla y 9 idiomas | Vysion',
      intro:
        'El ritmo del café exige caja rápida: hardware i5, 9 idiomas para equipos multilingües y control de márgenes — TPV para brasserie, bar de café y lunch.',
      body1:
        'Rush matinal o terraza llena: la caja más rápida. Sala, para llevar y pedido online en un flujo — ideal en Bélgica para cafés con picos.',
      body2:
        'Menos toques, menos errores, más cubiertos. Prueba Vysion gratis — potencia i5 y propiedad a los 24 meses.',
      imageAlt: 'Layout Vysion TPV para café y brasserie',
      cta: 'Empezar gratis',
      ownership24: 'Deja de alquilar. A los 24 meses, este TPV i5 es 100 % tuyo.',
    },
    frituur: {
      h1: 'TPV freiduría | Checkout i5 más rápido | Vysion',
      intro:
        'Picos de freiduría y eventos: tu caja debe aguantar. Intel i5, doble pantalla para el cliente, 9 idiomas — para colas, aceite y ritmo.',
      body1:
        'Pedidos, salsas y guarniciones sin bloqueos. TPV táctil, impresora integrada y pedido online — el TPV freiduría Bélgica y Países Bajos.',
      body2:
        'Colas cortas, márgenes claros. Empieza gratis, prueba en tu local, hardware tuyo a los 24 meses.',
      imageAlt: 'Layout Vysion TPV para freiduría y snack',
      cta: 'Empezar gratis',
      ownership24: 'Deja de alquilar. A los 24 meses, este TPV i5 es 100 % tuyo.',
    },
    kebab: {
      h1: 'TPV kebab y bocatería | Potencia i5 | Vysion',
      intro:
        'Noches intensas y bocadillos al máximo: hardware i5 y 9 idiomas mantienen al equipo rápido — TPV para kebab, döner y bocatería.',
      body1:
        'Sala, recogida y reparto sin caos. Flujo de caja rápido con tickets claros — TPV hostelería Bélgica para alto rendimiento.',
      body2:
        'Menos estrés en mostrador, más control de ingresos. Prueba gratis y ve por qué eligen i5.',
      imageAlt: 'Layout Vysion TPV para kebab y bocatería',
      cta: 'Empezar gratis',
      ownership24: 'Deja de alquilar. A los 24 meses, este TPV i5 es 100 % tuyo.',
    },
    kapper: {
      h1: 'TPV para peluquerías y salones | Elegante y rápido | Vysion',
      intro:
        'TPV i5 profesional, pagos fluidos, 9 idiomas para el equipo, propiedad del hardware a los 24 meses — la mejora para tu salón.',
      body1:
        'Sin colas en recepción con sillones llenos. El flujo más rápido mantiene el día ordenado — salones Bélgica y Países Bajos.',
      body2:
        'Citas, venta y propinas en una vista. Prueba Vysion gratis — checkout premium.',
      imageAlt: 'Layout Vysion TPV para peluquería',
      cta: 'Empezar gratis',
      ownership24: 'Deja de alquilar. A los 24 meses, este TPV i5 es 100 % tuyo.',
    },
    retail: {
      h1: "TPV retail y stock | El i5 'Bestia' para tiendas | Vysion",
      intro:
        'Stock en i5 (8 GB RAM), TPV táctil e integración web gratis — retail que crece contigo.',
      body1:
        'TPV retail rápido: stock y venta en una pantalla. Comprar TPV con margen y velocidad — sistema belga para tiendas.',
      body2:
        'Del código de barras al cierre: menos errores, más ritmo. Hardware premium tuyo a los 24 meses — sin alquilar sin beneficio.',
      imageAlt: 'Layout Vysion TPV para retail y tienda',
      cta: 'Empezar gratis',
      ownership24: 'Deja de alquilar. A los 24 meses, este TPV i5 es 100 % tuyo.',
    },
  },
  it: {
    breadcrumb: 'Settori',
    hardwareBeest: {
      title: "Vysion i5 dual-screen: 'La Bestia'",
      specProcessor: '🚀 Processore: Intel i5 Core (velocità senza pari)',
      specMemory: '🧠 Memoria: 8 GB RAM + 128 GB SSD',
      specScreens: '🖥️ Schermi: 15" operatore + 11,5" cliente',
      specLanguages: '🌍 Lingue: 9 lingue (tra cui arabo, cinese, giapponese)',
      specIncluded: '🖨️ Incluso: stampante integrata + 5 rotoli di carta gratis',
      blackVariantTitle: 'Disponibile anche in nero',
      demoCta: 'Richiedi ora la demo gratuita — Ritiro immediato nel nostro negozio in Belgio',
    },
    bakkerij: {
      h1: 'Cassa più veloce per panetterie | i5 e 9 lingue | Vysion',
      intro:
        'Layout cassa per panetteria: Intel i5 per il picco mattutino, 9 lingue per il team, proprietà hardware dopo 24 mesi — il POS Belgio e Paesi Bassi.',
      body1:
        'Brunch o weekend intenso? POS touch, stampante e software reattivo. Acquisto o leasing: un pacchetto chiaro, zero sorprese.',
      body2:
        'Per chi vuole margine e ritmo. Proprietà dopo 24 mesi batte l’affitto infinito — il POS belga su cui crescere.',
      imageAlt: 'Layout cassa Vysion per panetteria',
      cta: 'Inizia gratis — prova 14 giorni',
      ownership24: 'Smetti di noleggiare. Dopo 24 mesi questa cassa i5 è 100% tua.',
    },
    cafe: {
      h1: 'Cassa ristorazione per caffè | i5 dual-screen e 9 lingue | Vysion',
      intro:
        'Il ritmo del bar chiede cassa veloce: hardware i5, 9 lingue per team multilingue, margini sotto controllo — POS per brasserie, coffee bar e pranzo.',
      body1:
        'Picco mattutino o terrazza piena: la cassa più veloce al banco. Sala, asporto e ordini online in un flusso — ideale in Belgio per bar affollati.',
      body2:
        'Meno tocchi, meno errori, più coperti. Prova Vysion gratis — potenza i5 e proprietà dopo 24 mesi.',
      imageAlt: 'Layout cassa Vysion per caffè e brasserie',
      cta: 'Inizia gratis',
      ownership24: 'Smetti di noleggiare. Dopo 24 mesi questa cassa i5 è 100% tua.',
    },
    frituur: {
      h1: 'Cassa friggitoria | Checkout i5 più veloce | Vysion',
      intro:
        'Picchi da friggitoria ed eventi: la cassa deve reggere. Intel i5, doppio schermo cliente, 9 lingue — per code, olio e ritmo.',
      body1:
        'Ordini, salse e contorni senza rallentamenti. POS touch, stampante integrata e ordini online — cassa friggitoria Belgio e Paesi Bassi.',
      body2:
        'Code corte, margini stretti. Inizia gratis, prova in negozio, hardware tuo dopo 24 mesi.',
      imageAlt: 'Layout cassa Vysion per friggitoria e snack',
      cta: 'Inizia gratis',
      ownership24: 'Smetti di noleggiare. Dopo 24 mesi questa cassa i5 è 100% tua.',
    },
    kebab: {
      h1: 'Cassa kebab & panineria | Potenza i5 | Vysion',
      intro:
        'Sere piene e panini al massimo: i5 e 9 lingue tengono il team veloce — POS per kebab, döner e panineria.',
      body1:
        'Sala, asporto e consegna senza caos. Flusso cassa rapido con scontrini chiari — POS Belgio per alto throughput.',
      body2:
        'Meno stress al bancone, più controllo sui ricavi. Prova gratis e scopri perché si sceglie i5.',
      imageAlt: 'Layout cassa Vysion per kebab e panineria',
      cta: 'Inizia gratis',
      ownership24: 'Smetti di noleggiare. Dopo 24 mesi questa cassa i5 è 100% tua.',
    },
    kapper: {
      h1: 'Cassa per parrucchieri e saloni | Elegante e veloce | Vysion',
      intro:
        'Cassa i5 professionale, pagamenti fluidi, 9 lingue per il team, proprietà hardware dopo 24 mesi — l’upgrade per il tuo salone.',
      body1:
        'Niente code in reception con poltrone piene. Il flusso più veloce tiene la giornata in carreggiata — saloni Belgio e Paesi Bassi.',
      body2:
        'Appuntamenti, vendita e mance in un’unica vista. Prova Vysion gratis — checkout premium.',
      imageAlt: 'Layout cassa Vysion per salone',
      cta: 'Inizia gratis',
      ownership24: 'Smetti di noleggiare. Dopo 24 mesi questa cassa i5 è 100% tua.',
    },
    retail: {
      h1: "Cassa retail & magazzino | L'i5 'Bestia' per negozi | Vysion",
      intro:
        'Magazzino su i5 (8 GB RAM), POS touch e integrazione web gratuita — retail che scala con te.',
      body1:
        'Cassa retail veloce: magazzino e vendita su uno schermo. Acquisto POS con margini e velocità — sistema belga per negozi.',
      body2:
        'Dal barcode alla chiusura: meno errori, più ritmo. Hardware premium tuo dopo 24 mesi — niente affitto senza vantaggio.',
      imageAlt: 'Layout cassa Vysion per retail e negozio',
      cta: 'Inizia gratis',
      ownership24: 'Smetti di noleggiare. Dopo 24 mesi questa cassa i5 è 100% tua.',
    },
  },
  ja: {
    breadcrumb: '業種',
    hardwareBeest: {
      title: 'Vysion i5 デュアル画面「The Beast」',
      specProcessor: '🚀 プロセッサ: Intel i5 Core（圧倒的な速さ）',
      specMemory: '🧠 メモリ: 8GB RAM + 128GB SSD',
      specScreens: '🖥️ 画面: 15インチメイン + 11.5インチ客向け',
      specLanguages: '🌍 言語: 9言語（アラビア語・中国語・日本語など）',
      specIncluded: '🖨️ 同梱: 内蔵プリンター + 感熱ロール紙5本無料',
      blackVariantTitle: 'ブラックカラーもあり',
      demoCta: '無料デモを今すぐ依頼 — ベルギー店舗ですぐ受け取り可能',
    },
    bakkerij: {
      h1: 'ベーカリー向け最速POS | i5 & 9言語 | Vysion',
      intro:
        '朝のピークに強いIntel i5、チーム向け9言語、24か月後にハードがあなたの資産に — ベルギー・オランダの店舗向けPOS。',
      body1:
        '週末ランチの混雑にも耐えるタッチPOSとレシートプリンター。購入もリースもシンプルな一パッケージ。',
      body2:
        'マージンとスピードを重視するパン屋に。24か月後の所有は長期レンタルより有利 — 成長できるベルギー向けPOS。',
      imageAlt: 'ベーカリー向けVysion POSレイアウト',
      cta: '無料で開始 — 14日間トライアル',
      ownership24: 'レンタルをやめましょう。24か月後、このi5レジは100％あなたの資産です。',
    },
    cafe: {
      h1: 'カフェ向け飲食POS | i5デュアル画面 & 9言語 | Vysion',
      intro:
        'カフェの忙しさに合わせた高速レジ：i5、多言語チーム向け9言語、粗利の可視化 — ブラッスリー・コーヒーバー向け。',
      body1:
        '朝のラッシュもテラス席も、最速の会計フロー。店内・テイクアウト・オンライン注文を一元化 — ベルギーのカフェに最適。',
      body2:
        'タップを減らし、ミスを減らし、回転を上げる。無料で試してi5の体感と24か月後の所有を。',
      imageAlt: 'カフェ・ブラッスリー向けVysion POSレイアウト',
      cta: '無料で開始',
      ownership24: 'レンタルをやめましょう。24か月後、このi5レジは100％あなたの資産です。',
    },
    frituur: {
      h1: 'フライショップ向けPOS | 最速i5会計 | Vysion',
      intro:
        'ピークとイベントでも止まらないレジ：Intel i5、客向けデュアル画面、9言語 — 行列とスピード向け。',
      body1:
        '注文・ソース・サイドをスムーズに。タッチPOS、内蔵プリンター、オンライン注文を一体に — ベルギー・オランダのフライ店向け。',
      body2:
        '列を短く、粗利をキープ。無料で試し、24か月後にハードを所有。',
      imageAlt: 'フライ店・スナック向けVysion POSレイアウト',
      cta: '無料で開始',
      ownership24: 'レンタルをやめましょう。24か月後、このi5レジは100％あなたの資産です。',
    },
    kebab: {
      h1: 'ケバブ・サンドイッチバー向けPOS | i5パワー | Vysion',
      intro:
        '深夜の忙しさと大量オーダーに：i5と9言語でスタッフを高速に — ケバブ・ドネル・サンドイッチバー向け。',
      body1:
        '店内・テイクアウト・デリバリーを混乱なく。明確なチケットで高速会計 — 高回転飲食向けベルギーPOS。',
      body2:
        'レジ前のストレスを減らし売上を把握。無料体験でi5が選ばれる理由を。',
      imageAlt: 'ケバブ・サンドイッチバー向けVysion POSレイアウト',
      cta: '無料で開始',
      ownership24: 'レンタルをやめましょう。24か月後、このi5レジは100％あなたの資産です。',
    },
    kapper: {
      h1: '美容室・サロン向けPOS | スタイリッシュで高速 | Vysion',
      intro:
        'プロ仕様のi5レジ、スムーズな決済、チーム向け9言語、24か月後にハード所有 — サロンのアップグレード。',
      body1:
        '満席時も受付に行列を作らない最速フロー — ベルギー・オランダのサロン向け。',
      body2:
        '予約・物販・チップを一元表示。無料で試すプレミアム会計体験。',
      imageAlt: 'ヘアサロン向けVysion POSレイアウト',
      cta: '無料で開始',
      ownership24: 'レンタルをやめましょう。24か月後、このi5レジは100％あなたの資産です。',
    },
    retail: {
      h1: '小売POS & 在庫 | 店舗向けi5「Beast」| Vysion',
      intro:
        'i5（8GB RAM）で在庫管理、タッチPOS、無料サイト連携 — 店とともに伸びる小売レジ。',
      body1:
        '在庫と販売を同一画面で高速化。マージンとレジ速度を両立 — ベルギー小売向け。',
      body2:
        'バーコードから締めまで：ミス削減・テンポ向上。24か月後にプレミアム端末を所有。',
      imageAlt: '小売・店舗向けVysion POSレイアウト',
      cta: '無料で開始',
      ownership24: 'レンタルをやめましょう。24か月後、このi5レジは100％あなたの資産です。',
    },
  },
  zh: {
    breadcrumb: '行业方案',
    hardwareBeest: {
      title: 'Vysion i5 双屏收银机「猛兽」',
      specProcessor: '🚀 处理器：Intel i5 核心（极速体验）',
      specMemory: '🧠 内存：8GB RAM + 128GB SSD',
      specScreens: '🖥️ 屏幕：15 英寸主屏 + 11.5 英寸客显',
      specLanguages: '🌍 语言：9 种语言（含阿拉伯语、中文、日语等）',
      specIncluded: '🖨️ 包含：内置打印机 + 免费 5 卷热敏纸',
      blackVariantTitle: '亦提供黑色款',
      demoCta: '立即申请免费演示 — 可从我们在比利时的门店直接取货',
    },
    bakkerij: {
      h1: '面包房最快收银系统 | i5 性能与 9 种语言 | Vysion',
      intro:
        '面向面包房的布局：Intel i5 应对早高峰，团队支持 9 种语言，24 个月后硬件归您 — 比利时与荷兰门店之选。',
      body1:
        '早午餐与周末高峰也能保持流畅：触屏 POS、小票打印机与稳定软件。购买或租赁方案清晰，一次打包无隐藏费用。',
      body2:
        '为关注毛利与效率的烘焙商家而打造。24 个月后拥有设备，胜过长期租赁 — 可伴随业务成长的比利时 POS。',
      imageAlt: 'Vysion 面包房收银布局',
      cta: '免费开始 — 14 天试用',
      ownership24: '别再只租不买。24 个月后，这台 i5 收银机 100% 归您所有。',
    },
    cafe: {
      h1: '咖啡馆餐饮收银 | i5 双屏与 9 种语言 | Vysion',
      intro:
        '咖啡馆节奏需要更快收银：i5 硬件、多语言团队的 9 种语言、毛利一目了然 — 适用于餐吧、咖啡吧与简餐。',
      body1:
        '早高峰或露台繁忙也能保持最快结账。堂食、外带与线上订单同一流程 — 适合比利时高客流咖啡馆。',
      body2:
        '更少点击、更少差错、更高翻台。免费试用 Vysion，感受 i5 性能与 24 个月后设备归属。',
      imageAlt: 'Vysion 咖啡馆与餐吧收银布局',
      cta: '免费开始',
      ownership24: '别再只租不买。24 个月后，这台 i5 收银机 100% 归您所有。',
    },
    frituur: {
      h1: '炸物店收银 | 最快 i5 结账 | Vysion',
      intro:
        '高峰与活动日也要跟得上：Intel i5、面向顾客的双屏、团队 9 种语言 — 为排队与快节奏而设计。',
      body1:
        '订单、酱汁与配菜流畅录入。触屏 POS、内置打印机与线上点餐一体 — 比利时与荷兰炸物店方案。',
      body2:
        '缩短排队、稳住毛利。免费试用，店内实测，24 个月后硬件归您。',
      imageAlt: 'Vysion 炸物店与小吃店收银布局',
      cta: '免费开始',
      ownership24: '别再只租不买。24 个月后，这台 i5 收银机 100% 归您所有。',
    },
    kebab: {
      h1: '烤肉/三明治店收银 | i5 强劲性能 | Vysion',
      intro:
        '深夜高峰与大量三明治：i5 与 9 种语言让团队保持高效 — 面向烤肉、 döner 与三明治吧。',
      body1:
        '堂食、自取与外卖不再混乱。小票清晰、结账更快 — 比利时高客流餐饮 POS。',
      body2:
        '减轻柜台压力，更好掌控营收。免费试用，了解为何商家选择 i5。',
      imageAlt: 'Vysion 烤肉与三明治店收银布局',
      cta: '免费开始',
      ownership24: '别再只租不买。24 个月后，这台 i5 收银机 100% 归您所有。',
    },
    kapper: {
      h1: '美发沙龙收银 | 优雅且快速 | Vysion',
      intro:
        '专业 i5 收银、顺畅收款、团队 9 种语言，24 个月后硬件归您 — 为沙龙升级而生。',
      body1:
        '满座也不让前台排长队。最快结账流程稳住全天节奏 — 面向比利时与荷兰沙龙。',
      body2:
        '预约、零售与小费一屏掌握。免费试用 Vysion，体验高端硬件下的流畅结账。',
      imageAlt: 'Vysion 美发沙龙收银布局',
      cta: '免费开始',
      ownership24: '别再只租不买。24 个月后，这台 i5 收银机 100% 归您所有。',
    },
    retail: {
      h1: '零售收银与库存 | 门店 i5「猛兽」| Vysion',
      intro:
        '以 i5（8GB RAM）管理库存，触屏 POS 与免费网站对接 — 与门店共同成长的零售收银。',
      body1:
        '想要快速零售收银？库存与销售同屏完成。关注毛利与排队速度 — 比利时门店系统。',
      body2:
        '从条码到日结：更少差错、更高效率。24 个月后拥有高端硬件 — 不再无意义地长期租用。',
      imageAlt: 'Vysion 零售门店收银布局',
      cta: '免费开始',
      ownership24: '别再只租不买。24 个月后，这台 i5 收银机 100% 归您所有。',
    },
  },
  ar: {
    breadcrumb: 'القطاعات',
    hardwareBeest: {
      title: 'Vysion i5 بشاشتين — «الوحش»',
      specProcessor: '🚀 المعالج: Intel i5 Core (سرعة استثنائية)',
      specMemory: '🧠 الذاكرة: 8 جيجابايت RAM + 128 جيجابايت SSD',
      specScreens: '🖥️ الشاشتان: 15" رئيسية + 11.5" للعميل',
      specLanguages: '🌍 اللغات: 9 لغات (منها العربية والصينية واليابانية)',
      specIncluded: '🖨️ يشمل: طابعة مدمجة + 5 بكرات ورق مجانًا',
      blackVariantTitle: 'متوفر أيضًا باللون الأسود',
      demoCta: 'اطلب عرضك التجريبي المجاني الآن — جاهز للاستلام من متجرنا في بلجيكا',
    },
    bakkerij: {
      h1: 'أسرع نقاط بيع للمخابز | i5 وتسع لغات | Vysion',
      intro:
        'تخطيط كاشير للمخابز: Intel i5 لذروة الصباح، وتسع لغات للفريق، وامتلاك الجهاز بعد 24 شهرًا — نظام بلجيكا وهولندا.',
      body1:
        'ذروة برانش أو نهاية الأسبوع؟ شاشة لمس وطابعة وبرنامج سريع. الشراء أو التأجير: باقة واحدة واضحة.',
      body2:
        'لمن يهتم بالهامش والسرعة. الامتلاك بعد 24 شهرًا أفضل من الإيجار الدائم — نقطة بيع بلجيكية للنمو.',
      imageAlt: 'تخطيط كاشير Vysion للمخبز',
      cta: 'ابدأ مجانًا — تجربة 14 يومًا',
      ownership24: 'توقف عن الإيجار. بعد 24 شهرًا، جهاز الكاشير i5 هذا ملكك بالكامل.',
    },
    cafe: {
      h1: 'نقطة بيع للمقاهي | i5 بشاشتين وتسع لغات | Vysion',
      intro:
        'إيقاع المقهى يحتاج كاشيرًا سريعًا: جهاز i5 وتسع لغات للطاقات متعددة اللغات ورؤية الهامش — لمقاهي وبراسيري وغداء.',
      body1:
        'ذروة الصباح أو المقهى الخارجي: أسرع صندوق. الصالة والطلب الخارجي والأونلاين في تدفق واحد — مثالي في بلجيكا.',
      body2:
        'نقرات أقل، أخطاء أقل، تغطية أعلى. جرّب Vysion مجانًا — قوة i5 وامتلاك بعد 24 شهرًا.',
      imageAlt: 'تخطيط كاشير Vysion للمقهى والبراسيري',
      cta: 'ابدأ مجانًا',
      ownership24: 'توقف عن الإيجار. بعد 24 شهرًا، جهاز الكاشير i5 هذا ملكك بالكامل.',
    },
    frituur: {
      h1: 'كاشير المقلي | أسرع دفع i5 | Vysion',
      intro:
        'ذروة المقلي والفعاليات: جهازك يجب أن يلحق. Intel i5 وشاشتان للعميل وتسع لغات — للطوابير والزيت والسرعة.',
      body1:
        'طلبات وصلصات وإضافات بلا تعليق. شاشة لمس وطابعة مدمجة وطلب أونلاين — كاشير المقلي في بلجيكا وهولندا.',
      body2:
        'طوابير أقصر وهوامش أوضح. ابدأ مجانًا، اختبر في محلك، وامتلك الجهاز بعد 24 شهرًا.',
      imageAlt: 'تخطيط كاشير Vysion للمقلي والوجبات الخفيفة',
      cta: 'ابدأ مجانًا',
      ownership24: 'توقف عن الإيجار. بعد 24 شهرًا، جهاز الكاشير i5 هذا ملكك بالكامل.',
    },
    kebab: {
      h1: 'كاشير الكباب وساندوتش بار | قوة i5 | Vysion',
      intro:
        'ليل مزدحم وساندوتش بلا توقف: i5 وتسع لغات تبقي الفريق سريعًا — للكباب والدونر وبار الساندوتش.',
      body1:
        'الصالة والاستلام والتوصيل بلا فوضى. تدفق كاشير سريع بتذاكر واضحة — نقطة بيع بلجيكية بإنتاجية عالية.',
      body2:
        'ضغط أقل على الكاونتر، تحكم أفضل بالإيرادات. جرّب مجانًا واكتشف لماذا يختارون i5.',
      imageAlt: 'تخطيط كاشير Vysion للكباب وبار الساندوتش',
      cta: 'ابدأ مجانًا',
      ownership24: 'توقف عن الإيجار. بعد 24 شهرًا، جهاز الكاشير i5 هذا ملكك بالكامل.',
    },
    kapper: {
      h1: 'كاشير الصالونات والحلاقة | أنيق وسريع | Vysion',
      intro:
        'كاشير i5 احترافي، دفع سلس، تسع لغات للفريق، امتلاك الجهاز بعد 24 شهرًا — ترقية لصالونك.',
      body1:
        'لا طوابير على الاستقبال والكراسي ممتلئة. أسرع تدفق يحافظ على يومك — صالونات بلجيكا وهولندا.',
      body2:
        'مواعيد ومبيعات وبخشيش في عرض واحد. جرّب Vysion مجانًا — دفع مميز.',
      imageAlt: 'تخطيط كاشير Vysion لصالون الحلاقة',
      cta: 'ابدأ مجانًا',
      ownership24: 'توقف عن الإيجار. بعد 24 شهرًا، جهاز الكاشير i5 هذا ملكك بالكامل.',
    },
    retail: {
      h1: 'كاشير التجزئة والمخزون | i5 «الوحش» للمتاجر | Vysion',
      intro:
        'مخزون على i5 (8 جيجابايت RAM)، شاشة لمس وتكامل موقع مجاني — كاشير تجزئة ينمو معك.',
      body1:
        'كاشير تجزئة سريع: مخزون ومبيعات على شاشة واحدة. شراء كاشير بهامش وسرعة — نظام بلجيكي للمتاجر.',
      body2:
        'من الباركود إلى الإغلاق: أخطاء أقل وسرعة أعلى. امتلك الجهاز المميز بعد 24 شهرًا — بلا إيجار بلا فائدة.',
      imageAlt: 'تخطيط كاشير Vysion للتجزئة والمتجر',
      cta: 'ابدأ مجانًا',
      ownership24: 'توقف عن الإيجار. بعد 24 شهرًا، جهاز الكاشير i5 هذا ملكك بالكامل.',
    },
  },
}

for (const loc of Object.keys(SECTOR_PAGES)) {
  const fp = path.join(messagesDir, `${loc}.json`)
  const raw = fs.readFileSync(fp, 'utf8')
  const data = JSON.parse(raw)
  data.sectorPages = SECTOR_PAGES[loc]
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log('patched', loc)
}
