/**
 * Voegt sectorPages toe aan messages/*.json (éénmalig uitvoeren na wijzigingen).
 * Run: node scripts/merge-sector-pages-i18n.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const messagesDir = path.join(root, 'messages')

const SECTOR_PAGES = {
  nl: {
    breadcrumb: 'Sectoren',
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
    },
    horecaSnack: {
      h1: 'Horeca Kassa voor Café, Frituur & Kebab | Vysion All-in-One',
      intro:
        'Razendsnel bestellen en afrekenen: i5-hardware (‘Het Beest’), 9 talen voor meertalig personeel en grip op je marge — dé horeca kassa voor café, frituur, kebab en broodjesbar.',
      body1:
        'Snachts druk of middagrush: je wilt de snelste kassa aan de toonbank. Kassa kopen met software, hardware en online bestelplatform in één aanpak — ideaal als kassasysteem België voor takeaway en zaal.',
      body2:
        'Van broodjesbar tot kebabzaak: houd overzicht op orders, stock en afrekenen. Probeer gratis en ervaar waarom ondernemers kiezen voor i5-kracht in plaats van traag materiaal.',
      imageAlt: 'Vysion kassa layout voor café, frituur en kebab',
      cta: 'Start gratis',
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
    },
    hardwarePlatform: {
      h1: 'Gratis Online Platform & i5 Kassa Hardware | De Vysion Deal',
      intro:
        'Beste platform voor ondernemers: high-end i5-kassa (‘Het Beest’), 44 video-instructies, 9 talen, en na 24 maanden ben jij eigenaar van de hardware — stop met zinloos huren.',
      body1:
        'Combineer online bestelplatform, webshop en kassa in één ecosysteem. Kassa kopen of starten met een helder abonnement: de snelste kassa-ervaring dankzij i5 en SSD.',
      body2:
        'Gratis uitproberen, transparante prijzen, en het kassasysteem België en Nederland dat ondernemers kiezen voor groei — ontdek de Vysion-deal.',
      imageAlt: 'Vysion kassa layout voor hardware en platform',
      cta: 'Start gratis',
    },
  },
  en: {
    breadcrumb: 'Sectors',
    bakkerij: {
      h1: 'Fastest POS for Bakeries | i5 Power & 9 Languages | Vysion',
      intro:
        "Bakery-focused checkout layout: Intel i5 ('The Beast') for morning rush speed, 9 languages for your team, and you own the hardware after 24 months — the POS system Belgium and the Netherlands rely on.",
      body1:
        'Need the fastest checkout for busy brunch and weekend peaks? Touchscreen POS, receipt printer and software that stay responsive. Buying a POS or leasing stays clear: one package, no install surprises.',
      body2:
        'Built for bakers who care about margin and pace. Ownership after 24 months beats renting forever — the Belgium POS platform you can grow on.',
      imageAlt: 'Vysion POS layout for bakery',
      cta: 'Start free — 14-day trial',
    },
    horecaSnack: {
      h1: 'Hospitality POS for Café, Chip Shop & Kebab | Vysion All-in-One',
      intro:
        'Fast order and payment flow: i5 hardware, 9 languages for multilingual crews, margin control — the hospitality POS for cafés, chip shops, kebab and sandwich bars.',
      body1:
        'Late-night rush or lunch peak: you want the fastest checkout. Buy a POS with software, hardware and online ordering in one stack — ideal as a Belgium POS for dine-in and takeaway.',
      body2:
        'From sandwich bar to kebab: keep orders, stock and payments in view. Try free and feel why founders pick i5 power over sluggish kit.',
      imageAlt: 'Vysion POS layout for café, chip shop and kebab',
      cta: 'Start free',
    },
    kapper: {
      h1: 'POS for Hair Salons | Stylish & Fast | Vysion',
      intro:
        'Give your salon the upgrade: professional i5 POS, smooth payments, 9 languages for your team, and you own the hardware after 24 months.',
      body1:
        'No queues at the desk while chairs are full. The fastest checkout flow keeps your day on track. Buy or lease a POS with clear terms — Belgium & Netherlands salons.',
      body2:
        'Combine appointments, retail and tips in one view. Try Vysion free and discover stylish, fast checkout with premium hardware.',
      imageAlt: 'Vysion POS layout for hair salon',
      cta: 'Start free',
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
    },
    hardwarePlatform: {
      h1: 'Free Online Platform & i5 POS Hardware | The Vysion Deal',
      intro:
        'Built for operators: high-end i5 POS, 44 video tutorials, 9 languages, and hardware ownership after 24 months — stop pointless renting.',
      body1:
        'Combine online ordering, webshop and checkout in one ecosystem. Buy a POS or start on a clear plan — fastest checkout with i5 and SSD.',
      body2:
        'Free trial, transparent pricing, and the Belgium & Netherlands POS platform founders pick for growth — discover the Vysion deal.',
      imageAlt: 'Vysion POS layout for hardware and platform',
      cta: 'Start free',
    },
  },
  de: {
    breadcrumb: 'Branchen',
    bakkerij: {
      h1: 'Schnellstes Kassensystem für Bäckereien | i5-Power & 9 Sprachen | Vysion',
      intro:
        "Bäckerei-Layout: Intel i5 („Das Biest“) für Morgenspitzen, 9 Sprachen fürs Team, nach 24 Monaten gehört die Hardware Ihnen — das Kassensystem Belgien und die Niederlande.",
      body1:
        'Sie wollen die schnellste Kasse bei Brunch und Wochenendstress? Touchscreen-POS, Bondrucker, Software ohne Hänger. Kasse kaufen oder leasen: ein Paket, klare Kosten.',
      body2:
        'Für Bäcker mit Fokus auf Tempo und Marge. Eigentum nach 24 Monaten statt endloses Mieten — belgisches Kassensystem zum Dranbleiben.',
      imageAlt: 'Vysion Kassenlayout für Bäckerei',
      cta: 'Kostenlos starten',
    },
    horecaSnack: {
      h1: 'Gastro-Kasse für Café, Imbiss & Kebab | Vysion All-in-One',
      intro:
        'Schnell bestellen und kassieren: i5-Hardware, 9 Sprachen, Margenkontrolle — die Gastro-Kasse für Café, Frittenbude, Kebab und Sandwichbar.',
      body1:
        'Nachtschicht oder Mittagsansturm: die schnellste Kasse an der Theke. Kasse kaufen mit Software, Hardware und Online-Bestellplattform — ideal als Kassensystem Belgien.',
      body2:
        'Von Sandwich bis Kebab: Bestellungen, Bestand, Zahlung im Blick. Kostenlos testen und i5-Leistung statt langsamer Kassen spüren.',
      imageAlt: 'Vysion Kassenlayout für Café, Imbiss und Kebab',
      cta: 'Kostenlos starten',
    },
    kapper: {
      h1: 'Kassensystem für Friseur & Salon | Stilvoll & schnell | Vysion',
      intro:
        'Upgrade für Ihren Salon: professionelle i5-Kasse, schnelles Bezahlen, 9 Sprachen, nach 24 Monaten gehört die Hardware Ihnen.',
      body1:
        'Keine Schlange an der Rezeption während voller Stühle. Schnellste Kassenabwicklung, klare Kauf-/Mietmodelle — Kassensystem Belgien & Niederlande.',
      body2:
        'Termine, Verkauf und Trinkgeld in einem Überblick. Vysion gratis testen — stilvolle, schnelle Kasse mit Premium-Hardware.',
      imageAlt: 'Vysion Kassenlayout für Friseur und Salon',
      cta: 'Kostenlos starten',
    },
    retail: {
      h1: "Retail-Kasse & Bestand | Das i5-„Biest“ für Shops | Vysion",
      intro:
        'Bestand auf leistungsstarker i5-Hardware (8 GB RAM), Touchscreen-POS und Website-Integration — Retail-Kasse, die mitwächst.',
      body1:
        'Schnelle Retail-Kasse: Bestand und Verkauf auf einem Bildschirm. Kasse kaufen mit Margen- und Tempo-Fokus — Kassensystem Belgien für Läden.',
      body2:
        'Vom Barcode bis Tagesabschluss: weniger Fehler, mehr Tempo. Eigentum nach 24 Monaten — Schluss mit nutzlosem Mieten.',
      imageAlt: 'Vysion Kassenlayout für Retail und Laden',
      cta: 'Kostenlos starten',
    },
    hardwarePlatform: {
      h1: 'Gratis Online-Plattform & i5-Kassenhardware | Das Vysion-Angebot',
      intro:
        'High-End-i5-Kasse, 44 Videoanleitungen, 9 Sprachen, Hardware-Eigentum nach 24 Monaten — aufhören, sinnlos zu mieten.',
      body1:
        'Online-Bestellplattform, Webshop und Kasse vereint. Kasse kaufen oder mit klarem Abo starten — schnellste Kasse dank i5 und SSD.',
      body2:
        'Kostenlos testen, transparente Preise, Kassensystem Belgien & Niederlande für Wachstum — das Vysion-Angebot entdecken.',
      imageAlt: 'Vysion Kassenlayout für Hardware und Plattform',
      cta: 'Kostenlos starten',
    },
  },
  fr: {
    breadcrumb: 'Secteurs',
    bakkerij: {
      h1: 'Caisse la plus rapide pour boulangers | Puissance i5 & 9 langues | Vysion',
      intro:
        "Mise en caisse pensée boulangerie : Intel i5 (« La Bête ») pour les pics du matin, 9 langues, propriété du matériel après 24 mois — le système de caisse Belgique et Pays-Bas.",
      body1:
        'Vous voulez la caisse la plus rapide aux brunchs chargés ? POS tactile, imprimante, logiciel fluide. Acheter une caisse ou louer : un forfait clair.',
      body2:
        'Pour les boulangers qui veulent marge et rythme. Propriété après 24 mois plutôt que louer sans fin — système de caisse Belgique solide.',
      imageAlt: 'Disposition caisse Vysion pour boulangerie',
      cta: 'Commencer gratuitement',
    },
    horecaSnack: {
      h1: 'Caisse horeca pour café, friterie & kebab | Vysion tout-en-un',
      intro:
        'Encaissement et commandes rapides : matériel i5, 9 langues pour équipes multilingues, maîtrise des marges — la caisse horeca pour café, friterie, kebab et sandwicherie.',
      body1:
        'Rush du soir ou midi : la caisse la plus rapide au comptoir. Acheter une caisse avec logiciel, matériel et commande en ligne — système de caisse Belgique idéal.',
      body2:
        'Du snack au kebab : commandes, stock, paiements sous contrôle. Essayez gratuitement et sentez la puissance i5.',
      imageAlt: 'Disposition caisse Vysion pour café, friterie et kebab',
      cta: 'Commencer gratuitement',
    },
    kapper: {
      h1: 'Système de caisse salons & coiffure | Élégant & rapide | Vysion',
      intro:
        'Valorisez votre salon : caisse i5 pro, encaissement fluide, 9 langues, matériel à vous après 24 mois.',
      body1:
        'Pas de file à l’accueil quand les fauteuils sont pleins. La caisse la plus rapide, achat ou location clairs — système Belgique & Pays-Bas.',
      body2:
        'Rendez-vous, ventes et pourboires dans une vue. Essayez Vysion gratuitement — checkout rapide et matériel premium.',
      imageAlt: 'Disposition caisse Vysion pour salon de coiffure',
      cta: 'Commencer gratuitement',
    },
    retail: {
      h1: "Caisse retail & stocks | L'i5 « Bête » pour magasins | Vysion",
      intro:
        'Stocks sur i5 puissant (8 Go RAM), POS tactile et site intégré — caisse retail qui grandit avec vous.',
      body1:
        'Caisse retail rapide : stock et vente sur un écran. Acheter une caisse avec marges et file rapide — système Belgique pour magasins.',
      body2:
        'Du code-bar à la clôture : moins d’erreurs, plus de vitesse. Propriété du matériel après 24 mois.',
      imageAlt: 'Disposition caisse Vysion pour retail et magasin',
      cta: 'Commencer gratuitement',
    },
    hardwarePlatform: {
      h1: 'Plateforme en ligne gratuite & matériel i5 | Offre Vysion',
      intro:
        'POS i5 haut de gamme, 44 vidéos, 9 langues, propriété du matériel après 24 mois — fini la location sans intérêt.',
      body1:
        'Commande en ligne, boutique web et caisse réunies. Acheter une caisse ou démarrer avec un abonnement clair — rapidité i5 + SSD.',
      body2:
        'Essai gratuit, tarifs transparents, système Belgique & Pays-Bas choisi pour croître — découvrez l’offre Vysion.',
      imageAlt: 'Disposition caisse Vysion pour matériel et plateforme',
      cta: 'Commencer gratuitement',
    },
  },
  es: {
    breadcrumb: 'Sectores',
    bakkerij: {
      h1: 'TPV más rápido para panaderías | Potencia i5 y 9 idiomas | Vysion',
      intro:
        "Caja pensada para panadería: Intel i5 («La Bestia») para picos matutinos, 9 idiomas, hardware tuyo a los 24 meses — sistema de caja Bélgica y Países Bajos.",
      body1:
        '¿La caja más rápida en brunchs llenos? TPV táctil, impresora y software fluido. Comprar caja o alquilar: un paquete claro.',
      body2:
        'Para panaderos que cuidan margen y ritmo. Propiedad a los 24 meses frente a alquilar sin fin — sistema de caja Bélgica sólido.',
      imageAlt: 'Disposición de caja Vysion para panadería',
      cta: 'Empezar gratis',
    },
    horecaSnack: {
      h1: 'TPV horeca para café, freiduría y kebab | Vysion todo en uno',
      intro:
        'Pedidos y cobro rápidos: hardware i5, 9 idiomas, control de márgenes — el TPV horeca para café, freiduría, kebab y bocadillería.',
      body1:
        'Rush nocturno o mediodía: la caja más rápida en barra. Comprar caja con software, hardware y pedidos online — sistema Bélgica ideal.',
      body2:
        'Del bocadillo al kebab: pedidos, stock y pagos bajo control. Prueba gratis y nota la potencia i5.',
      imageAlt: 'Disposición de caja Vysion para café, freiduría y kebab',
      cta: 'Empezar gratis',
    },
    kapper: {
      h1: 'TPV para peluquerías y salones | Elegante y rápido | Vysion',
      intro:
        'Mejora tu salón: TPV i5 profesional, cobro fluido, 9 idiomas, hardware tuyo a los 24 meses.',
      body1:
        'Sin colas en recepción con sillones llenos. La caja más rápida; compra o alquiler claros — sistema Bélgica y Países Bajos.',
      body2:
        'Citas, ventas y propinas en una vista. Prueba Vysion gratis — cobro rápido con hardware premium.',
      imageAlt: 'Disposición de caja Vysion para peluquería y salón',
      cta: 'Empezar gratis',
    },
    retail: {
      h1: "TPV retail y stock | El i5 «Bestia» para tiendas | Vysion",
      intro:
        'Stock en i5 potente (8 GB RAM), TPV táctil e integración web — caja retail que crece contigo.',
      body1:
        'TPV retail rápido: stock y ventas en una pantalla. Comprar caja con márgenes y cola ágil — sistema Bélgica para tiendas.',
      body2:
        'Del código de barras al cierre: menos errores, más velocidad. Propiedad del hardware a los 24 meses.',
      imageAlt: 'Disposición de caja Vysion para retail y tienda',
      cta: 'Empezar gratis',
    },
    hardwarePlatform: {
      h1: 'Plataforma online gratis y hardware TPV i5 | Oferta Vysion',
      intro:
        'TPV i5 de gama alta, 44 vídeos, 9 idiomas, propiedad a los 24 meses — deja de alquilar sin sentido.',
      body1:
        'Pedidos online, webshop y caja unificados. Comprar caja o empezar con plan claro — máxima velocidad con i5 y SSD.',
      body2:
        'Prueba gratis, precios transparentes, sistema Bélgica y Países Bajos para crecer — descubre la oferta Vysion.',
      imageAlt: 'Disposición de caja Vysion para hardware y plataforma',
      cta: 'Empezar gratis',
    },
  },
  it: {
    breadcrumb: 'Settori',
    bakkerij: {
      h1: 'Cassa più veloce per panetterie | Potenza i5 e 9 lingue | Vysion',
      intro:
        "Layout cassa per panetteria: Intel i5 («La Bestia») per picchi mattutini, 9 lingue, hardware tuo dopo 24 mesi — sistema cassa Belgio e Paesi Bassi.",
      body1:
        'Vuoi la cassa più veloce nei brunch affollati? POS touchscreen, stampante, software reattivo. Comprare cassa o noleggio: un pacchetto chiaro.',
      body2:
        'Per panettieri attenti a margini e ritmo. Proprietà dopo 24 mesi invece di noleggiare all’infinito — sistema cassa Belgio solido.',
      imageAlt: 'Layout cassa Vysion per panetteria',
      cta: 'Inizia gratis',
    },
    horecaSnack: {
      h1: 'Cassa horeca per café, friggitoria e kebab | Vysion tutto-in-uno',
      intro:
        'Ordini e incassi veloci: hardware i5, 9 lingue per staff multilingue, controllo margini — cassa horeca per café, friggitoria, kebab e paninoteca.',
      body1:
        'Picco notturno o pranzo: la cassa più veloce al banco. Comprare cassa con software, hardware e ordini online — sistema Belgio ideale.',
      body2:
        'Dal panino al kebab: ordini, magazzino, pagamenti sotto controllo. Prova gratis e senti la potenza i5.',
      imageAlt: 'Layout cassa Vysion per café, friggitoria e kebab',
      cta: 'Inizia gratis',
    },
    kapper: {
      h1: 'Cassa per parrucchieri e saloni | Elegante e veloce | Vysion',
      intro:
        'Valore al salone: cassa i5 professionale, incasso fluido, 9 lingue, hardware tuo dopo 24 mesi.',
      body1:
        'Niente code in reception con poltrone piene. Cassa più veloce; acquisto o noleggio chiari — sistema Belgio e Paesi Bassi.',
      body2:
        'Appuntamenti, vendite e mance in una vista. Prova Vysion gratis — checkout rapido con hardware premium.',
      imageAlt: 'Layout cassa Vysion per parrucchiere e salone',
      cta: 'Inizia gratis',
    },
    retail: {
      h1: "Cassa retail e scorte | L'i5 «Bestia» per negozi | Vysion",
      intro:
        'Scorte su i5 potente (8 GB RAM), POS touchscreen e integrazione web — cassa retail che scala con te.',
      body1:
        'Cassa retail veloce: scorte e vendite su uno schermo. Comprare cassa con margini e coda agile — sistema Belgio per negozi.',
      body2:
        'Dal barcode alla chiusura: meno errori, più velocità. Proprietà hardware dopo 24 mesi.',
      imageAlt: 'Layout cassa Vysion per retail e negozio',
      cta: 'Inizia gratis',
    },
    hardwarePlatform: {
      h1: 'Piattaforma online gratuita e hardware cassa i5 | Offerta Vysion',
      intro:
        'Cassa i5 top, 44 video, 9 lingue, proprietà hardware dopo 24 mesi — basta noleggi inutili.',
      body1:
        'Ordini online, webshop e cassa unificati. Comprare cassa o iniziare con piano chiaro — massima velocità con i5 e SSD.',
      body2:
        'Prova gratis, prezzi trasparenti, sistema Belgio e Paesi Bassi per crescere — scopri l’offerta Vysion.',
      imageAlt: 'Layout cassa Vysion per hardware e piattaforma',
      cta: 'Inizia gratis',
    },
  },
  ja: {
    breadcrumb: '業種',
    bakkerij: {
      h1: 'ベーカリー向け最速POS｜i5パワー＆9言語｜Vysion',
      intro:
        'パン屋向けレジ構成：朝のピークに強いIntel i5（「The Beast」）、9言語、24か月後にハードがあなたのものに — ベルギー・オランダ向けPOS。',
      body1:
        '混むブランチでも最速レジを。タッチPOS・レシートプリンター・軽快なソフト。POS購入もリースも分かりやすい一括パッケージ。',
      body2:
        'マージンとスピードを重視するパン屋向け。24か月後の所有は長期レンタルより有利 — 成長できるPOS。',
      imageAlt: 'ベーカリー向けVysionレジレイアウト',
      cta: '無料で始める',
    },
    horecaSnack: {
      h1: 'カフェ・揚げ物・ケバブ向け飲食POS｜Vysionオールインワン',
      intro:
        '高速注文・会計：i5端末、多言語チーム向け9言語、粗利管理 — カフェ、揚げ物店、ケバブ、サンドイッチ向け。',
      body1:
        '深夜ラッシュも昼のピークも、カウンターは最速レジで。ソフト・ハード・オンライン注文を一体に — ベルギー向けPOSに最適。',
      body2:
        'サンドイッチからケバブまで、注文・在庫・決済を一元管理。無料トライアルでi5の速さを体感。',
      imageAlt: 'カフェ・揚げ物・ケバブ向けVysionレジレイアウト',
      cta: '無料で始める',
    },
    kapper: {
      h1: '美容院・ヘアサロン向けPOS｜スタイリッシュで高速｜Vysion',
      intro:
        'サロンをアップグレード：プロ仕様のi5レジ、スムーズな会計、9言語、24か月後にハードはあなたのもの。',
      body1:
        '満席時も受付に行列を作らない。最速会計フロー。購入・リース条件も明確 — ベルギー・オランダのサロン向け。',
      body2:
        '予約・物販・チップを一元表示。無料トライアルでプレミアムハードの快適さを。',
      imageAlt: '美容院・サロン向けVysionレジレイアウト',
      cta: '無料で始める',
    },
    retail: {
      h1: '小売POSと在庫｜店舗向けi5「ビースト」｜Vysion',
      intro:
        '高性能i5（8GB RAM）、タッチPOS、サイト連携で在庫管理 — 店とともに伸びるレジ。',
      body1:
        '小売でも最速レジ：在庫と販売を一画面。POS購入で粗利と列対策 — ベルギー向け小売システム。',
      body2:
        'バーコードから締めまで：ミス削減・スピードアップ。24か月後にハード資産化。',
      imageAlt: '小売・店舗向けVysionレジレイアウト',
      cta: '無料で始める',
    },
    hardwarePlatform: {
      h1: '無料オンラインプラットフォーム＆i5レジハード｜Vysion特典',
      intro:
        'ハイエンドi5レジ、44本の動画ガイド、9言語、24か月後にハード所有 — 無意味なレンタルから脱却。',
      body1:
        'オンライン注文・ウェブショップ・レジを一体に。POS購入も明確なプランで開始 — i5とSSDの速さ。',
      body2:
        '無料トライアル、透明価格、成長志向のベルギー・オランダ向けPOS — Vysion特典を確認。',
      imageAlt: 'ハードウェア・プラットフォーム向けVysionレジレイアウト',
      cta: '無料で始める',
    },
  },
  zh: {
    breadcrumb: '行业',
    bakkerij: {
      h1: '面包房最快收银｜i5 性能与 9 种语言｜Vysion',
      intro:
        '面向面包店的收银布局：Intel i5（“猛兽”）应对早高峰，9 种语言，24 个月后硬件归您 — 比利时与荷兰适用的收银系统。',
      body1:
        '早午餐高峰也要最快收银：触屏 POS、小票机、流畅软件。购买或租赁收银方案清晰，一次打包无隐藏安装费。',
      body2:
        '为重视节奏与毛利的烘焙店打造。24 个月拥有硬件优于长期租赁 — 可信赖的比利时收银体系。',
      imageAlt: 'Vysion 面包店收银布局',
      cta: '免费开始',
    },
    horecaSnack: {
      h1: '咖啡馆、炸物与烤肉店餐饮收银｜Vysion 一体化',
      intro:
        '快速点餐与结账：i5 设备、9 种语言服务多语团队、掌控毛利 — 面向咖啡馆、炸物店、烤肉和三明治吧。',
      body1:
        '夜宵或午高峰都需要最快收银。软硬件与在线订餐一体 — 适合比利时餐饮外卖与堂食。',
      body2:
        '从三明治到烤肉：订单、库存、收款一目了然。免费试用感受 i5 性能。',
      imageAlt: 'Vysion 咖啡馆、炸物与烤肉收银布局',
      cta: '免费开始',
    },
    kapper: {
      h1: '美发沙龙收银｜优雅且快速｜Vysion',
      intro:
        '升级沙龙：专业 i5 收银、顺畅收款、9 种语言，24 个月后硬件归您。',
      body1:
        '满座时前台不排长队。最快收银流程；购买或租赁条款清晰 — 面向比利时与荷兰沙龙。',
      body2:
        '预约、零售与小费一屏掌握。免费试用 Vysion，体验高端硬件下的快速结账。',
      imageAlt: 'Vysion 美发沙龙收银布局',
      cta: '免费开始',
    },
    retail: {
      h1: '零售收银与库存｜门店 i5“猛兽”｜Vysion',
      intro:
        '以强劲 i5（8GB 内存）、触屏 POS 与网站集成管理库存 — 随店成长的零售收银。',
      body1:
        '零售也要最快收银：库存与销售同屏。购买收银即可关注毛利与排队 — 比利时门店系统。',
      body2:
        '从条码到日结：更少错误、更高效率。24 个月后拥有高端硬件。',
      imageAlt: 'Vysion 零售门店收银布局',
      cta: '免费开始',
    },
    hardwarePlatform: {
      h1: '免费线上平台与 i5 收银硬件｜Vysion 方案',
      intro:
        '高端 i5 收银、44 条视频教程、9 种语言，24 个月后硬件归您 — 告别无意义的长期租用。',
      body1:
        '在线订餐、网店与收银一体。购买或以清晰套餐起步 — i5 与 SSD 带来最快速度。',
      body2:
        '免费试用、透明定价、助力增长的比利时与荷兰收银平台 — 了解 Vysion 方案。',
      imageAlt: 'Vysion 硬件与平台收银布局',
      cta: '免费开始',
    },
  },
  ar: {
    breadcrumb: 'القطاعات',
    bakkerij: {
      h1: 'أسرع نظام كاشير للمخابز | قوة i5 و9 لغات | Vysion',
      intro:
        'تخطيط كاشير للمخابز: Intel i5 («الوحش») لذروة الصباح، 9 لغات، وتصبح الأجهزة ملكك بعد 24 شهرًا — نظام كاشير بلجيكا وهولندا.',
      body1:
        'تريد أسرع كاشير في أوقات الفطور المزدحمة؟ شاشة لمس وطابعة وبرنامج سلس. شراء كاشير أو تأجير: باقة واحدة واضحة.',
      body2:
        'للمخابز التي تهتم بالهامش والسرعة. الملكية بعد 24 شهرًا أفضل من الإيجار الدائم — نظام كاشير بلجيكا يعتمد عليه.',
      imageAlt: 'تخطيط كاشير Vysion للمخبز',
      cta: 'ابدأ مجانًا',
    },
    horecaSnack: {
      h1: 'كاشير المطاعم للمقاهي والقلي والكباب | Vysion الكل في واحد',
      intro:
        'طلبات ودفع سريعان: أجهزة i5، 9 لغات للطاقم متعدد اللغات، تحكم بالهامش — كاشير المطاعم للمقاهي والقلي والكباب والساندويتش.',
      body1:
        'زحام ليلي أو وقت الغداء: أسرع كاشير عند المنضدة. شراء كاشير مع برمجيات وأجهزة وطلبات أونلاين — نظام بلجيكا المثالي.',
      body2:
        'من الساندويتش إلى الكباب: طلبات ومخزون ومدفوعات تحت السيطرة. جرّب مجانًا واختبر قوة i5.',
      imageAlt: 'تخطيط كاشير Vysion للمقهى والقلي والكباب',
      cta: 'ابدأ مجانًا',
    },
    kapper: {
      h1: 'كاشير الصالونات ومحلات الحلاقة | أنيق وسريع | Vysion',
      intro:
        'طور صالونك: كاشير i5 احترافي، دفع سلس، 9 لغات، والأجهزة ملكك بعد 24 شهرًا.',
      body1:
        'لا طوابير عند الاستقبال والمقاعد ممتلئة. أسرع تدفق دفع؛ شراء أو تأجير بشروط واضحة — نظام بلجيكا وهولندا للصالونات.',
      body2:
        'المواعيد والمبيعات والبخشيش في لوحة واحدة. جرّب Vysion مجانًا — دفع سريع بأجهزة ممتازة.',
      imageAlt: 'تخطيط كاشير Vysion لصالون الحلاقة',
      cta: 'ابدأ مجانًا',
    },
    retail: {
      h1: 'كاشير التجزئة والمخزون | i5 «الوحش» للمتاجر | Vysion',
      intro:
        'إدارة المخزون على i5 قوي (8 جيجابايت RAM) وPOS لمس وتكامل موقع — كاشير يتوسع مع متجرك.',
      body1:
        'كاشير تجزئة سريع: مخزون ومبيعات في شاشة واحدة. شراء كاشير مع هامش وسرعة طابور — نظام بلجيكا للمتاجر.',
      body2:
        'من الباركود إلى الإغلاق: أخطاء أقل وسرعة أعلى. امتلاك الأجهزة بعد 24 شهرًا.',
      imageAlt: 'تخطيط كاشير Vysion للتجزئة والمتجر',
      cta: 'ابدأ مجانًا',
    },
    hardwarePlatform: {
      h1: 'منصة أونلاين مجانية وأجهزة كاشير i5 | عرض Vysion',
      intro:
        'كاشير i5 راقٍ، 44 فيديو تعليميًا، 9 لغات، وامتلاك الأجهزة بعد 24 شهرًا — توقف عن الإيجار بلا فائدة.',
      body1:
        'طلبات أونلاين ومتجر ويب وكاشير في منظومة واحدة. شراء كاشير أو البدء بباقة واضحة — أقصى سرعة مع i5 وSSD.',
      body2:
        'تجربة مجانية وأسعار شفافة ونظام بلجيكا وهولندا للنمو — اكتشف عرض Vysion.',
      imageAlt: 'تخطيط كاشير Vysion للأجهزة والمنصة',
      cta: 'ابدأ مجانًا',
    },
  },
}

for (const lang of Object.keys(SECTOR_PAGES)) {
  const fp = path.join(messagesDir, `${lang}.json`)
  const raw = fs.readFileSync(fp, 'utf8')
  const data = JSON.parse(raw)
  if (data.sectorPages) {
    console.warn(`${lang}.json heeft al sectorPages — overslaan (verwijder sleutel om opnieuw te mergen).`)
    continue
  }
  data.sectorPages = SECTOR_PAGES[lang]
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log('merged sectorPages →', lang)
}
