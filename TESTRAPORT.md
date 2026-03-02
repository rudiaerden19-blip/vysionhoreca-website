# Vysion Horeca Platform — Officieel Testraport

**Datum start:** 1 maart 2026  
**Platform:** Vysion Horeca (Multi-tenant SaaS)  
**Tenants:** 500+  
**Omgeving:** Sandbox via Vercel (na GitHub push)

---

## ⚠️ GLOBALE REGEL — ALTIJD VAN TOEPASSING

> Elke wijziging raakt een multi-tenant omgeving van 500+ tenants.
> - Altijd `tenant_slug` gebruiken bij queries — nooit globale updates
> - Altijd backward compatible — bestaande tenants mogen niet breken
> - Altijd deployen via sandbox (Vercel preview) na GitHub push
> - RLS in Supabase nooit omzeilen
> - Nooit hardcoded tenant data in de code

---

## Module Testresultaten

| # | Module | Status | Opmerkingen |
|---|--------|--------|-------------|
| 1 | Registratie nieuwe tenant | ✅ SUCCES | Tenant aangemaakt, zichtbaar in Supabase |
| 2 | Tenant in Supabase | ✅ SUCCES | Data correct opgeslagen |
| 3 | Eigenaars admin dashboard toegang | ✅ SUCCES | Login en toegang werkt |
| 4 | Overzicht dashboard | ✅ SUCCES | "Snelle acties" sectie verwijderd |
| 5 | Keuken Display | ✅ SUCCES | Werkt correct |
| 6 | Shop Display | ✅ SUCCES | Werkt correct |
| 7 | Abonnement / Stripe | ✅ SUCCES | Aankoop, proefperiode melding, facturen, jaarlijkse korting (10%) gefixed |
| 8 | Bedrijfsanalyse | ✅ SUCCES | Werkt correct |
| 9 | Categorieën overzicht | ✅ SUCCES | Geïnspecteerd, geen fouten |
| 10 | Instellingen / Zaak profiel | ✅ SUCCES | "Ondernemingsnummer" veld verwijderd (BTW nr aanwezig) |
| 11 | Instellingen / Openingsuren | ✅ SUCCES | Werkt correct |
| 12 | Levering & Afhaling | ✅ SUCCES | 3 fixes: minimale bestelling blokkeert, delivery_fee opgeslagen in DB, radius bevestiging verplicht |
| 13 | Instellingen / Betaalmethodes | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 14 | Instellingen / Design & Kleuren | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 15 | Instellingen / Teksten | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 16 | Instellingen / Ons Team | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 17 | Instellingen / Cadeaubonnen | ✅ SUCCES | Volledig geaudit: Stripe, cash, email, code beveiliging, admin overzicht |
| 18 | Instellingen / SEO | ✅ SUCCES | Geïnspecteerd, werkt correct |
| — | **MODULE: INSTELLINGEN** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 19 | Menu / Categorieën | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 20 | Menu / Producten | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 21 | Menu / Opties & Extras | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 22 | Menu / Allergenen | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 23 | Menu / Foto & Media | ✅ SUCCES | Geïnspecteerd, werkt correct |
| — | **MODULE: MENU** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 24 | WhatsApp | ⚠️ GESLOTEN | Werkt correct — instelling kan klant NIET zelf configureren, moet door Vysion medewerker worden ingesteld |
| — | **MODULE: WHATSAPP** | ⚠️ **GESLOTEN** | Vereist Vysion medewerker voor configuratie |
| 25 | Marketing / Email Marketing | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 26 | Marketing / QR Codes | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 27 | Marketing / Reviews | ✅ SUCCES | Geïnspecteerd, werkt correct |
| — | **MODULE: MARKETING** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 28 | Klanten / Klantenoverzicht | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 29 | Klanten / Beloningen | ✅ SUCCES | Geïnspecteerd, werkt correct |
| — | **MODULE: KLANTEN** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 30 | Personeel / Medewerkers | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 31 | Personeel / Uren Registratie | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 32 | Personeel / Verlofbeheer | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 33 | Personeel / Vacatures | ✅ SUCCES | Geïnspecteerd, werkt correct |
| — | **MODULE: PERSONEEL** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 34 | Kostenberekening / Marge Instellingen | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 35 | Kostenberekening / Ingrediënten | ✅ SUCCES | Geïnspecteerd, werkt correct |
| 36 | Kostenberekening / Product Kostprijs | ✅ SUCCES | Geïnspecteerd, werkt correct |
| — | **MODULE: KOSTENBEREKENING** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 37 | GKS Rapporten / Z-Rapport Online Verkopen | ✅ SUCCES | Fiscale daggrens gefixed (00:00-12:00), dag afsluiten knop, archief vergrendeling, GKS compliant |
| 37b | GKS / Supabase migratie is_closed + closed_at | ✅ SUCCES | Migration uitgevoerd in Supabase |
| 38 | GKS / Z-Rapport Online Verkopen | ✅ SUCCES | Fiscale daggrens, afsluiten knop, kassa invoer, archief dag/week/maand/jaar |
| — | **MODULE: GKS RAPPORTEN** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 39 | Bestellingen / Live bestellingen | ✅ SUCCES | Polling 3s, geluid, goedkeuren/weigeren, keuken modus |
| 40 | Bestellingen / Archief dag/week/maand/jaar | ✅ SUCCES | Nieuw gebouwd en gedeployed |
| — | **MODULE: BESTELLINGEN** | ✅ **GESLOTEN** | Alle sub-modules getest en geslaagd |
| 41 | Reserveringen | ✅ SUCCES | Real-time, bevestigen/weigeren, email naar klant, aan/uit toggle |
| — | **MODULE: RESERVERINGEN** | ✅ **GESLOTEN** | Getest en geslaagd |
| 42 | Groepsbestellingen / Groep beheren | ✅ SUCCES | Aanmaken, toegangscode, betalingsopties, adres |
| 43 | Groepsbestellingen / Bestelsessies | ✅ SUCCES | Deadline, levertijd, statusbeheer |
| 44 | Groepsbestellingen / Groepsbestellingen | ✅ SUCCES | Per persoon, keuken overzicht, labels printen |
| 45 | Groepsbestellingen / Label Printer | ✅ SUCCES | Real-time queue, selectief/alles printen, formaat instelbaar |
| — | **MODULE: GROEPSBESTELLINGEN** | ✅ **GESLOTEN** | Alle 4 sub-modules getest en geslaagd |
| 46 | Inloggen / Uitloggen | ✅ SUCCES | Werkt correct |
| — | **MODULE: IN/UITLOGGEN** | ✅ **GESLOTEN** | Getest en geslaagd |
| 47 | Online Shop (klantweergave) | ✅ SUCCES | Geïnspecteerd, werkt correct |
| — | **MODULE: ONLINE SHOP** | ✅ **GESLOTEN** | Getest en geslaagd |

---

## Fixes Uitgevoerd

| Fix | Bestand | Beschrijving |
|-----|---------|-------------|
| Snelle acties verwijderd | `admin/page.tsx` | UI sectie + data array verwijderd |
| Stripe jaarprijs fix | `api/create-subscription-checkout/route.ts` | 10% korting correct toegepast, jaarlijks interval |
| Ondernemingsnummer verwijderd | `admin/profiel/page.tsx` | Overbodig veld verwijderd |
| canSubmit min. bestelling | `checkout/page.tsx` | Blokkeert submit als subtotaal < min. bestelling bij bezorging |
| delivery_fee in DB | `checkout/page.tsx` | Bezorgkost opgeslagen in orders tabel |
| Radius bevestiging | `checkout/page.tsx` | Verplichte checkbox voor klant binnen bezorgzone |

---

---

## ✅ EINDRESULTAAT — ALLE MODULES GETEST

**Testdatum:** 1 maart 2026  
**Totaal getest:** 47 modules / sub-modules  
**Geslaagd:** 47  
**Gefaald:** 0  
**Opmerkingen:** 1 (WhatsApp — Vysion medewerker vereist voor configuratie)

### Fixes uitgevoerd tijdens testtraject

| # | Fix | Status |
|---|-----|--------|
| 1 | Snelle acties verwijderd uit admin dashboard | ✅ |
| 2 | Stripe jaarlijkse abonnementsprijs 10% korting | ✅ |
| 3 | Ondernemingsnummer veld verwijderd uit zaak profiel | ✅ |
| 4 | Levering: minimale bestelling blokkeert submit | ✅ |
| 5 | Levering: delivery_fee opgeslagen in database | ✅ |
| 6 | Levering: radius bevestigingscheckbox verplicht | ✅ |
| 7 | GKS Z-rapport: fiscale daggrens 00:00 t/m +1dag 12:00u | ✅ |
| 8 | GKS Z-rapport: Dag afsluiten knop (GKS immutabiliteit) | ✅ |
| 9 | GKS Z-rapport: Kassa invoer (contant/kaart/online) | ✅ |
| 10 | GKS Z-rapport: Archief per dag/week/maand/jaar | ✅ |
| 11 | Bestellingen: Archief per dag/week/maand/jaar | ✅ |

### Supabase Migraties uitgevoerd

| Bestand | Beschrijving |
|---------|-------------|
| `z_reports_audit_migration.sql` | Audit trail kolommen |
| `z_reports_close_migration.sql` | is_closed + closed_at |
| `z_reports_kassa_migration.sql` | Handmatige kassa invoer |
| `team_giftcards_migration.sql` | Cadeaubonnen tabel |

---

**Platform: Vysion Horeca — Multi-tenant SaaS — 500+ tenants**  
**Goedgekeurd door:** Rudi Aerden  
**Datum goedkeuring:** 1 maart 2026

*Klaar voor conversie naar PDF.*
