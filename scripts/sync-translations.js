const fs = require('fs');
const path = require('path');

// Translations mapping NL -> other languages
const translations = {
  de: {
    // Dashboard
    "Welkom terug": "Willkommen zurück",
    "Vandaag": "Heute",
    "Deze week": "Diese Woche",
    "Deze maand": "Diesen Monat",
    "Omzet": "Umsatz",
    "Bestellingen": "Bestellungen",
    "Bezoekers": "Besucher",
    "Gemiddeld": "Durchschnitt",
    "Populaire producten": "Beliebte Produkte",
    "Recente bestellingen": "Letzte Bestellungen",
    "Bekijk alle bestellingen": "Alle Bestellungen anzeigen",
    "Geen bestellingen vandaag": "Keine Bestellungen heute",
    "Snelle acties": "Schnelle Aktionen",
    "Product toevoegen": "Produkt hinzufügen",
    "Categorie toevoegen": "Kategorie hinzufügen",
    "Instellingen": "Einstellungen",
    "Statistieken": "Statistiken",
    "Verkoop per dag": "Verkauf pro Tag",
    "Verkoop per week": "Verkauf pro Woche",
    "Verkoop per maand": "Verkauf pro Monat",
    "Totaal": "Gesamt",
    "Aantal": "Anzahl",
    "Prijs": "Preis",
    "Naam": "Name",
    "Status": "Status",
    "Actief": "Aktiv",
    "Inactief": "Inaktiv",
    "Beschikbaar": "Verfügbar",
    "Niet beschikbaar": "Nicht verfügbar",
    "Bewerken": "Bearbeiten",
    "Verwijderen": "Löschen",
    "Opslaan": "Speichern",
    "Annuleren": "Abbrechen",
    "Toevoegen": "Hinzufügen",
    "Zoeken": "Suchen",
    "Filter": "Filter",
    "Sorteren": "Sortieren",
    "Laden": "Laden",
    "Opgeslagen": "Gespeichert",
    "Fout": "Fehler",
    "Succes": "Erfolg",
    "Waarschuwing": "Warnung",
    "Bevestigen": "Bestätigen",
    "Ja": "Ja",
    "Nee": "Nein",
    "Terug": "Zurück",
    "Volgende": "Weiter",
    "Vorige": "Zurück",
    "Sluiten": "Schließen",
    "Openen": "Öffnen",
    "Meer": "Mehr",
    "Minder": "Weniger",
    "Alles": "Alles",
    "Geen": "Keine",
    "Of": "Oder",
    "En": "Und",
    "Met": "Mit",
    "Zonder": "Ohne",
    "Nieuw": "Neu",
    "Oud": "Alt",
    "Groot": "Groß",
    "Klein": "Klein",
    "Hoog": "Hoch",
    "Laag": "Niedrig",
    "Eerste": "Erste",
    "Laatste": "Letzte",
    "Begin": "Start",
    "Einde": "Ende",
    "Datum": "Datum",
    "Tijd": "Zeit",
    "Dag": "Tag",
    "Week": "Woche",
    "Maand": "Monat",
    "Jaar": "Jahr",
    "Uur": "Stunde",
    "Minuut": "Minute",
    "Seconde": "Sekunde",
    // Orders
    "Bestelling": "Bestellung",
    "Afgehaald": "Abgeholt",
    "Bezorgd": "Geliefert",
    "In behandeling": "In Bearbeitung",
    "Geannuleerd": "Storniert",
    "Betaald": "Bezahlt",
    "Niet betaald": "Nicht bezahlt",
    "Contant": "Bar",
    "Pin": "Karte",
    "Online": "Online",
    "Afhalen": "Abholen",
    "Bezorgen": "Liefern",
    "Klant": "Kunde",
    "Adres": "Adresse",
    "Telefoon": "Telefon",
    "E-mail": "E-Mail",
    "Opmerking": "Bemerkung",
    "Subtotaal": "Zwischensumme",
    "Korting": "Rabatt",
    "BTW": "MwSt",
    "Totaal bedrag": "Gesamtbetrag",
    "Bestelling plaatsen": "Bestellung aufgeben",
    "Bestelling bevestigen": "Bestellung bestätigen",
    "Bestelling annuleren": "Bestellung stornieren",
    "Bestelling afdrukken": "Bestellung drucken",
    // Common
    "Laden...": "Laden...",
    "Bezig met opslaan...": "Speichern...",
    "Bezig met laden...": "Laden...",
    "Geen resultaten": "Keine Ergebnisse",
    "Geen producten gevonden": "Keine Produkte gefunden",
    "Geen categorieën gevonden": "Keine Kategorien gefunden",
    "Geen bestellingen gevonden": "Keine Bestellungen gefunden",
    "Weet je het zeker?": "Bist du sicher?",
    "Deze actie kan niet ongedaan worden gemaakt": "Diese Aktion kann nicht rückgängig gemacht werden",
    "Wijzigingen opgeslagen": "Änderungen gespeichert",
    "Er is iets misgegaan": "Etwas ist schiefgelaufen",
    "Probeer het opnieuw": "Versuche es erneut",
    "Verplicht veld": "Pflichtfeld",
    "Ongeldig e-mailadres": "Ungültige E-Mail-Adresse",
    "Ongeldig telefoonnummer": "Ungültige Telefonnummer",
    "Minimum": "Minimum",
    "Maximum": "Maximum",
  },
  fr: {
    // Dashboard
    "Welkom terug": "Bienvenue",
    "Vandaag": "Aujourd'hui",
    "Deze week": "Cette semaine",
    "Deze maand": "Ce mois",
    "Omzet": "Chiffre d'affaires",
    "Bestellingen": "Commandes",
    "Bezoekers": "Visiteurs",
    "Gemiddeld": "Moyenne",
    "Populaire producten": "Produits populaires",
    "Recente bestellingen": "Commandes récentes",
    "Bekijk alle bestellingen": "Voir toutes les commandes",
    "Geen bestellingen vandaag": "Aucune commande aujourd'hui",
    "Snelle acties": "Actions rapides",
    "Product toevoegen": "Ajouter un produit",
    "Categorie toevoegen": "Ajouter une catégorie",
    "Instellingen": "Paramètres",
    "Statistieken": "Statistiques",
    "Totaal": "Total",
    "Aantal": "Quantité",
    "Prijs": "Prix",
    "Naam": "Nom",
    "Status": "Statut",
    "Actief": "Actif",
    "Inactief": "Inactif",
    "Beschikbaar": "Disponible",
    "Niet beschikbaar": "Non disponible",
    "Bewerken": "Modifier",
    "Verwijderen": "Supprimer",
    "Opslaan": "Enregistrer",
    "Annuleren": "Annuler",
    "Toevoegen": "Ajouter",
    "Zoeken": "Rechercher",
    "Filter": "Filtre",
    "Sorteren": "Trier",
    "Laden": "Chargement",
    "Opgeslagen": "Enregistré",
    "Fout": "Erreur",
    "Succes": "Succès",
    "Ja": "Oui",
    "Nee": "Non",
    "Terug": "Retour",
    "Sluiten": "Fermer",
    "Nieuw": "Nouveau",
    "Datum": "Date",
    "Tijd": "Heure",
    // Orders
    "Bestelling": "Commande",
    "Afgehaald": "Récupéré",
    "Bezorgd": "Livré",
    "In behandeling": "En cours",
    "Geannuleerd": "Annulé",
    "Betaald": "Payé",
    "Niet betaald": "Non payé",
    "Contant": "Espèces",
    "Afhalen": "À emporter",
    "Bezorgen": "Livraison",
    "Klant": "Client",
    "Adres": "Adresse",
    "Telefoon": "Téléphone",
    "E-mail": "E-mail",
    "Opmerking": "Remarque",
    "Subtotaal": "Sous-total",
    "Korting": "Réduction",
    "BTW": "TVA",
    "Totaal bedrag": "Montant total",
  },
  es: {
    "Welkom terug": "Bienvenido",
    "Vandaag": "Hoy",
    "Deze week": "Esta semana",
    "Deze maand": "Este mes",
    "Omzet": "Ingresos",
    "Bestellingen": "Pedidos",
    "Bezoekers": "Visitantes",
    "Totaal": "Total",
    "Aantal": "Cantidad",
    "Prijs": "Precio",
    "Naam": "Nombre",
    "Status": "Estado",
    "Actief": "Activo",
    "Bewerken": "Editar",
    "Verwijderen": "Eliminar",
    "Opslaan": "Guardar",
    "Annuleren": "Cancelar",
    "Toevoegen": "Añadir",
    "Zoeken": "Buscar",
    "Ja": "Sí",
    "Nee": "No",
    "Terug": "Volver",
    "Datum": "Fecha",
    "Klant": "Cliente",
  },
  it: {
    "Welkom terug": "Benvenuto",
    "Vandaag": "Oggi",
    "Deze week": "Questa settimana",
    "Deze maand": "Questo mese",
    "Omzet": "Fatturato",
    "Bestellingen": "Ordini",
    "Totaal": "Totale",
    "Prijs": "Prezzo",
    "Naam": "Nome",
    "Bewerken": "Modifica",
    "Verwijderen": "Elimina",
    "Opslaan": "Salva",
    "Annuleren": "Annulla",
    "Ja": "Sì",
    "Nee": "No",
    "Terug": "Indietro",
    "Klant": "Cliente",
  }
};

function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Load NL as source
const nlPath = path.join(__dirname, '../messages/nl.json');
const nl = JSON.parse(fs.readFileSync(nlPath, 'utf8'));
const nlKeys = getAllKeys(nl);

const languages = ['de', 'fr', 'es', 'it', 'ar', 'ja', 'zh'];

languages.forEach(lang => {
  const langPath = path.join(__dirname, `../messages/${lang}.json`);
  const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  const langKeys = getAllKeys(langData);
  
  let added = 0;
  
  nlKeys.forEach(keyPath => {
    if (!langKeys.includes(keyPath)) {
      const nlValue = getNestedValue(nl, keyPath);
      
      // Try to translate or use NL value as fallback
      let translatedValue = nlValue;
      
      if (typeof nlValue === 'string' && translations[lang]) {
        // Check if we have a direct translation
        if (translations[lang][nlValue]) {
          translatedValue = translations[lang][nlValue];
        }
      }
      
      setNestedValue(langData, keyPath, translatedValue);
      added++;
    }
  });
  
  if (added > 0) {
    fs.writeFileSync(langPath, JSON.stringify(langData, null, 2) + '\n', 'utf8');
    console.log(`${lang.toUpperCase()}: Added ${added} missing translations`);
  } else {
    console.log(`${lang.toUpperCase()}: All translations present`);
  }
});

console.log('\nDone! Some values may still be in Dutch - manual review recommended.');
