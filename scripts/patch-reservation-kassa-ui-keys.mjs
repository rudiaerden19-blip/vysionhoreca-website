/**
 * Merges reservationKassa UI keys (does not wipe existing keys).
 * Run: node scripts/patch-reservation-kassa-ui-keys.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const UI = {
  nl: {
    pageTitle: 'Reservaties',
    systemTitle: 'Reservatiesysteem',
    systemDescription:
      'Beheer tafelreservaties, ontvang online boekingen en houd uw bezetting bij. Perfect voor restaurants, brasseries en cafés.',
    enableReservations: 'Reservaties inschakelen',
    close: 'Sluiten',
    coversExpected: '{count} personen verwacht',
    waitlist: 'Wachtlijst',
    walkIn: 'Walk-in',
    newShort: 'Nieuw',
    tabReservations: 'Reserveringen',
    tabFloorPlan: 'Plattegrond',
    tabTables: 'Tafels',
    tabContacts: 'Contacten',
    tabReports: 'Rapporten',
    tabSettings: 'Instellingen',
    searchPlaceholder: 'Zoek op naam, telefoon of e-mail…',
    addTable: 'Tafel toevoegen',
    tableLabel: 'Tafel',
    tableNumberRequired: 'Tafelnummer *',
    tableWithNumber: 'Tafel {number}',
    reservationsSection: 'Reservaties',
    reservationsFoundOn: 'Reservaties gevonden op:',
    insideBadge: 'Binnen',
    tableFreeBadge: 'Tafel vrij',
    reservationSettingsTitle: 'Reservatie-instellingen',
    reservationsEnabled: 'Reservaties ingeschakeld',
    confirmationModeOnlineLabel: 'Bevestigingsmodus online reservaties',
    searchLabel: 'Zoeken',
    editReservationTitle: 'Reservatie bewerken',
    statusConfirmed: 'Bevestigd',
    seatsAtTable: '{seats} plaatsen',
    status_PENDING: 'In afwachting',
    status_CONFIRMED: 'Bevestigd',
    status_CHECKED_IN: 'Ingecheckt',
    status_COMPLETED: 'Afgerond',
    status_NO_SHOW: 'No-show',
    status_CANCELLED: 'Geannuleerd',
    status_WAITLIST: 'Wachtlijst',
    floorFree: 'Vrij',
    floorReserved: 'Gereserveerd',
    floorOccupied: 'Bezet',
    floorPending: 'Afwachting',
    noTablesYet: 'Nog geen tafels aangemaakt',
    noTablesYetHint: 'Maak je plattegrond aan om tafels te zien',
    noTablesEmpty: 'Nog geen tafels',
    clickAddTableHint: 'Klik op “Tafel toevoegen” om te starten',
    floorOnlyShort: 'Vloer',
    floorOnlyLong: 'Alleen vloer',
    showPanels: 'Panelen tonen',
    forDate: 'voor {date}',
    calendar: 'Kalender',
    searchResShort: 'Zoek reserv.',
    seatsLabel: 'Aantal plaatsen',
    shapeLabel: 'Vorm',
    addButton: 'Toevoegen',
    rotate: 'Draaien',
    reset: 'Reset',
    reservationsEnabledDesc: 'Toon reservaties in de kassa',
    acceptOnline: 'Online reservaties',
    acceptOnlineDesc: 'Laat klanten online reserveren',
    manualConfirm: 'Handmatig',
    manualConfirmDesc:
      'Klant krijgt mail “in afwachting”. Jij keurt goed in de kassa → klant krijgt bevestigingsmail.',
    autoConfirm: 'Automatisch',
    autoConfirmDesc: 'Klant reserveert → direct bevestigd → klant krijgt meteen bevestigingsmail.',
    activeBadge: 'Actief',
    colTime: 'Tijd',
    colGuests: 'Personen',
    colName: 'Naam',
    colNotes: 'Opmerkingen',
    colDeposit: 'Voorschot betaald',
    colActions: 'Acties',
    waitlistSummary: '{count} wachtend · {guests} pers.',
    todayHeaderStats: '{covers} personen · {total} reservaties',
    dayResSummary: '{count} res. · {covers}p',
    guestsLabel: 'Personen',
    avgGroupLabel: 'Gem. groep',
    periodLabel: 'Periode',
    statusPresent: 'Aanwezig',
    statusExpected: 'Verwacht',
    statusUnknown: 'Onbekend',
    lockTables: 'Vergrendelen',
    unlockTables: 'Ontgrendelen',
    zoneInside: 'Binnen',
    zoneTerrace: 'Terras',
  },
  en: {
    pageTitle: 'Reservations',
    systemTitle: 'Reservation system',
    systemDescription:
      'Manage table reservations, accept online bookings, and track occupancy. Ideal for restaurants, brasseries, and cafés.',
    enableReservations: 'Enable reservations',
    close: 'Close',
    coversExpected: '{count} guests expected',
    waitlist: 'Waitlist',
    walkIn: 'Walk-in',
    newShort: 'New',
    tabReservations: 'Bookings',
    tabFloorPlan: 'Floor plan',
    tabTables: 'Tables',
    tabContacts: 'Contacts',
    tabReports: 'Reports',
    tabSettings: 'Settings',
    searchPlaceholder: 'Search by name, phone, or email…',
    addTable: 'Add table',
    tableLabel: 'Table',
    tableNumberRequired: 'Table number *',
    tableWithNumber: 'Table {number}',
    reservationsSection: 'Reservations',
    reservationsFoundOn: 'Reservations found on:',
    insideBadge: 'Seated',
    tableFreeBadge: 'Table free',
    reservationSettingsTitle: 'Reservation settings',
    reservationsEnabled: 'Reservations enabled',
    confirmationModeOnlineLabel: 'Online reservation confirmation mode',
    searchLabel: 'Search',
    editReservationTitle: 'Edit reservation',
    statusConfirmed: 'Confirmed',
    seatsAtTable: '{seats} seats',
    status_PENDING: 'Pending',
    status_CONFIRMED: 'Confirmed',
    status_CHECKED_IN: 'Checked in',
    status_COMPLETED: 'Completed',
    status_NO_SHOW: 'No-show',
    status_CANCELLED: 'Cancelled',
    status_WAITLIST: 'Waitlist',
    floorFree: 'Free',
    floorReserved: 'Reserved',
    floorOccupied: 'Occupied',
    floorPending: 'Pending',
    noTablesYet: 'No tables created yet',
    noTablesYetHint: 'Set up your floor plan to see tables',
    noTablesEmpty: 'No tables yet',
    clickAddTableHint: 'Click “Add table” to get started',
    floorOnlyShort: 'Floor',
    floorOnlyLong: 'Floor only',
    showPanels: 'Show panels',
    forDate: 'for {date}',
    calendar: 'Calendar',
    searchResShort: 'Search',
    seatsLabel: 'Number of seats',
    shapeLabel: 'Shape',
    addButton: 'Add',
    rotate: 'Rotate',
    reset: 'Reset',
    reservationsEnabledDesc: 'Show reservations in the POS',
    acceptOnline: 'Online reservations',
    acceptOnlineDesc: 'Let customers book online',
    manualConfirm: 'Manual',
    manualConfirmDesc: 'Customer gets a “pending” email. You approve in POS → confirmation email.',
    autoConfirm: 'Automatic',
    autoConfirmDesc: 'Customer books → confirmed immediately → confirmation email sent.',
    activeBadge: 'Active',
    colTime: 'Time',
    colGuests: 'Guests',
    colName: 'Name',
    colNotes: 'Notes',
    colDeposit: 'Deposit paid',
    colActions: 'Actions',
    waitlistSummary: '{count} waiting · {guests} guests',
    todayHeaderStats: '{covers} guests · {total} bookings',
    dayResSummary: '{count} res. · {covers}p',
    guestsLabel: 'Guests',
    avgGroupLabel: 'Avg. group',
    periodLabel: 'Period',
    statusPresent: 'Present',
    statusExpected: 'Expected',
    statusUnknown: 'Unknown',
    lockTables: 'Lock',
    unlockTables: 'Unlock',
    zoneInside: 'Inside',
    zoneTerrace: 'Terrace',
  },
}

const copyFromEn = ['fr', 'de', 'es', 'it', 'ja', 'zh', 'ar']
for (const loc of copyFromEn) {
  if (!UI[loc]) UI[loc] = { ...UI.en }
}

const frOverrides = {
  pageTitle: 'Réservations',
  tabReservations: 'Réservations',
  tabFloorPlan: 'Plan de salle',
  tabTables: 'Tables',
  tabContacts: 'Contacts',
  tabReports: 'Rapports',
  tabSettings: 'Paramètres',
  addTable: 'Ajouter une table',
  waitlist: "Liste d'attente",
  coversExpected: '{count} couverts attendus',
  floorFree: 'Libre',
  floorReserved: 'Réservé',
  floorOccupied: 'Occupé',
  floorPending: 'En attente',
  status_PENDING: 'En attente',
  status_CONFIRMED: 'Confirmé',
  status_CHECKED_IN: 'Arrivé',
  status_COMPLETED: 'Terminé',
  status_CANCELLED: 'Annulé',
  zoneInside: 'Salle',
  zoneTerrace: 'Terrasse',
}
const deOverrides = {
  pageTitle: 'Reservierungen',
  tabReservations: 'Reservierungen',
  tabFloorPlan: 'Grundriss',
  tabTables: 'Tische',
  tabContacts: 'Kontakte',
  tabReports: 'Berichte',
  tabSettings: 'Einstellungen',
  addTable: 'Tisch hinzufügen',
  waitlist: 'Warteliste',
  coversExpected: '{count} Gäste erwartet',
  floorFree: 'Frei',
  floorReserved: 'Reserviert',
  floorOccupied: 'Belegt',
  floorPending: 'Ausstehend',
  status_PENDING: 'Ausstehend',
  status_CONFIRMED: 'Bestätigt',
  status_CHECKED_IN: 'Eingecheckt',
  status_COMPLETED: 'Abgeschlossen',
  status_CANCELLED: 'Storniert',
  zoneInside: 'Innen',
  zoneTerrace: 'Terrasse',
}
const esOverrides = {
  pageTitle: 'Reservas',
  tabReservations: 'Reservas',
  tabFloorPlan: 'Plano',
  addTable: 'Añadir mesa',
  waitlist: 'Lista de espera',
  coversExpected: '{count} comensales esperados',
  zoneInside: 'Interior',
  zoneTerrace: 'Terraza',
}
const itOverrides = {
  pageTitle: 'Prenotazioni',
  tabReservations: 'Prenotazioni',
  tabFloorPlan: 'Planimetria',
  addTable: 'Aggiungi tavolo',
  waitlist: 'Lista d\'attesa',
  coversExpected: '{count} coperti attesi',
  zoneInside: 'Interno',
  zoneTerrace: 'Terrazza',
}

Object.assign(UI.fr, frOverrides)
Object.assign(UI.de, deOverrides)
Object.assign(UI.es, esOverrides)
Object.assign(UI.it, itOverrides)

const { EXTRA } = await import('./reservation-kassa-ui-extra.mjs')

const ALL = ['nl', 'en', 'fr', 'de', 'es', 'it', 'ja', 'zh', 'ar']

for (const loc of ALL) {
  let pack
  if (loc === 'nl') {
    pack = { ...UI.nl, ...EXTRA.nl }
  } else if (loc === 'en') {
    pack = { ...UI.en, ...EXTRA.en }
  } else {
    pack = { ...EXTRA.en, ...(UI[loc] || {}) }
  }
  const p = path.join(root, 'messages', `${loc}.json`)
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  j.reservationKassa = { ...(j.reservationKassa || {}), ...pack }
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
}
console.log('Patched reservationKassa UI keys for', ALL.join(', '))
