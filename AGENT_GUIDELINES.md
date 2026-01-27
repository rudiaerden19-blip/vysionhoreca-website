# 🛠️ Vysion Horeca - Agent/Developer Richtlijnen

> **Versie:** 1.0  
> **Datum:** Januari 2026  
> **Voor:** Nieuwe agents en developers die werken aan Vysion Horeca projecten

---

## 📋 Inhoudsopgave

1. [Kernprincipes](#-kernprincipes)
2. [Bug Fixing - De Juiste Manier](#-bug-fixing---de-juiste-manier)
3. [Git Workflow](#-git-workflow)
4. [Deployment Process](#-deployment-process)
5. [Code Grenzen - Waar Blijf Je Uit](#-code-grenzen---waar-blijf-je-uit)
6. [Testing Vereisten](#-testing-vereisten)
7. [Communicatie](#-communicatie)
8. [Checklist Voor Elke Taak](#-checklist-voor-elke-taak)

---

## 🎯 Kernprincipes

### De 5 Gouden Regels

| # | Regel | Betekenis |
|---|-------|-----------|
| 1 | **Fix de oorzaak, niet het symptoom** | Geen pleisters, echte oplossingen |
| 2 | **Test voordat je commit** | Nooit blindelings code pushen |
| 3 | **Blijf in je scope** | Raak geen code aan die niet relevant is |
| 4 | **Documenteer wat je doet** | Duidelijke commits en comments |
| 5 | **Vraag bij twijfel** | Beter vragen dan kapot maken |

---

## 🔧 Bug Fixing - De Juiste Manier

### ❌ FOUT: Pleister plakken

```javascript
// Bug: prijs toont NaN
// FOUT - dit is een pleister:
const price = isNaN(product.price) ? 0 : product.price
```

### ✅ GOED: Oorzaak vinden en fixen

```javascript
// Bug: prijs toont NaN
// GOED - zoek waarom price NaN is:
// 1. Check waar product.price vandaan komt
// 2. Fix de bron (database, API, berekening)
// 3. Voeg validatie toe bij de bron
```

### Stappen voor Bug Fixing

```
1. REPRODUCEER de bug
   └── Kun je hem zelf zien? Screenshot/video?

2. VIND de oorzaak
   └── Waar komt het probleem vandaan?
   └── Gebruik console.log, debugger, of lees de code

3. BEGRIJP de context
   └── Waarom is de code zo geschreven?
   └── Wat kan er kapot gaan als je het verandert?

4. FIX de root cause
   └── Los het echte probleem op
   └── Niet alleen het symptoom verbergen

5. TEST de fix
   └── Werkt de fix?
   └── Is er niets anders kapot gegaan?

6. COMMIT met duidelijke message
   └── Beschrijf WAT je hebt gefixt en WAAROM
```

### Bug Fix Commit Message Format

```
fix: [kort probleem] - [korte oplossing]

Probleem:
- Beschrijf wat er mis was

Oorzaak:
- Beschrijf waarom het mis ging

Oplossing:
- Beschrijf wat je hebt veranderd

Test:
- Beschrijf hoe je hebt getest
```

**Voorbeeld:**
```
fix: Prijs toonde NaN bij producten zonder ingrediënten

Probleem:
- Bij producten zonder ingrediënten was totalCost undefined

Oorzaak:
- reduce() op lege array zonder initial value

Oplossing:
- Initial value 0 toegevoegd aan reduce()

Test:
- Getest met product zonder ingrediënten
- Getest met product met ingrediënten
- Beide tonen correcte prijs
```

---

## 📦 Git Workflow

### Branch Strategie

```
main (productie)
  │
  ├── feature/nieuwe-functie
  ├── fix/bug-beschrijving
  └── hotfix/urgent-fix
```

### Commit Regels

| Type | Wanneer | Voorbeeld |
|------|---------|-----------|
| `feat:` | Nieuwe functionaliteit | `feat: Voeg QR-code generator toe` |
| `fix:` | Bug fix | `fix: Prijs berekening bij lege ingrediënten` |
| `refactor:` | Code verbetering zonder functie wijziging | `refactor: Vereenvoudig price calculator` |
| `style:` | Styling/CSS | `style: Verbeter mobile responsive layout` |
| `docs:` | Documentatie | `docs: Update README met setup instructies` |
| `chore:` | Onderhoud | `chore: Update dependencies` |

### Commit Grootte

```
✅ GOED: Kleine, focused commits
   - 1 commit = 1 logische verandering
   - Makkelijk te reviewen
   - Makkelijk terug te draaien

❌ FOUT: Mega commits
   - "Fixed everything" met 50 bestanden
   - Niemand kan dit reviewen
   - Onmogelijk terug te draaien
```

### Voor Je Commit

```bash
# 1. Check wat je hebt veranderd
git status
git diff

# 2. Build/lint check
npm run build
npm run lint

# 3. Alleen relevante files toevoegen
git add [specifieke files]

# 4. NIET doen:
git add .  # Voegt ALLES toe, ook troep
```

---

## 🚀 Deployment Process

### Stappen

```
1. Code klaar
   └── Alles werkt lokaal

2. Build test
   └── npm run build MOET slagen

3. Lint test
   └── npm run lint MOET slagen (geen errors)

4. Commit
   └── Duidelijke commit message

5. Push
   └── git push origin [branch]

6. Vercel deployment
   └── Check Vercel dashboard voor errors

7. Test op productie
   └── Controleer of het live werkt
```

### Deployment Checklist

- [ ] `npm run build` succesvol
- [ ] `npm run lint` geen errors
- [ ] Commit message is duidelijk
- [ ] Geen console.log statements achtergelaten
- [ ] Geen hardcoded test data
- [ ] Geen API keys/secrets in code
- [ ] Getest op mobile EN desktop
- [ ] Vercel deployment succesvol
- [ ] Live site gecontroleerd

---

## 🚫 Code Grenzen - Waar Blijf Je Uit

### Raak NOOIT Aan (zonder expliciete toestemming)

| Bestand/Folder | Reden |
|----------------|-------|
| `.env` / `.env.local` | API keys en secrets |
| `supabase/migrations/` | Database structuur |
| `middleware.ts` | Auth en routing logica |
| `src/lib/supabase.ts` | Database connectie |
| `package.json` dependencies | Kan alles breken |
| Andere tenant's data | Privacy/security |

### Vraag Eerst Bij

| Situatie | Waarom |
|----------|--------|
| Nieuwe NPM packages | Kunnen conflicten veroorzaken |
| Database schema wijzigingen | Kan data corrupt maken |
| Auth/login code | Security risico |
| Payment code (Stripe/Mollie) | Geld risico |
| Multi-tenant logica | Kan andere klanten raken |

### Veilig Om Te Wijzigen

| Wat | Voorbeeld |
|-----|-----------|
| UI componenten | Buttons, forms, layouts |
| Styling/CSS | Kleuren, spacing, fonts |
| Vertalingen | messages/*.json |
| Specifieke pagina's | Als je weet wat je doet |

---

## ✅ Testing Vereisten

### Minimum Testing

```
1. Build test
   npm run build
   └── MOET slagen

2. Lint test
   npm run lint
   └── Geen errors (warnings OK)

3. Handmatige test
   └── Open de pagina in browser
   └── Test de functionaliteit
   └── Test op mobile (responsive)
```

### Test Scenario's

| Type | Wat testen |
|------|------------|
| **Happy path** | Normale flow werkt |
| **Edge cases** | Lege data, rare input |
| **Error cases** | Wat als iets faalt? |
| **Mobile** | Werkt op telefoon? |
| **Verschillende browsers** | Chrome, Safari, Firefox |

### Voordat Je "Klaar" Zegt

- [ ] Heb ik de fix zelf getest?
- [ ] Heb ik edge cases getest?
- [ ] Werkt het op mobile?
- [ ] Is er niets anders kapot gegaan?
- [ ] Build en lint slagen?

---

## 💬 Communicatie

### Bij Bug Reports

Geef altijd:
```
1. Screenshot of video
2. Stappen om te reproduceren
3. Verwacht gedrag
4. Daadwerkelijk gedrag
5. Browser/device info
```

### Bij Vragen

```
✅ GOED:
"Ik wil X aanpassen om Y te fixen. 
Ik denk dat ik bestand Z moet wijzigen.
Is dit de juiste aanpak?"

❌ FOUT:
"Werkt niet"
"Hoe fix ik dit?"
```

### Bij Completion

```
Wat ik heb gedaan:
- [lijst van wijzigingen]

Wat ik heb getest:
- [lijst van tests]

Commit: [hash of link]

Live URL: [als relevant]
```

---

## 📝 Checklist Voor Elke Taak

### Start Taak
- [ ] Begrijp ik wat er gevraagd wordt?
- [ ] Weet ik welke bestanden ik moet aanpassen?
- [ ] Heb ik lokaal de laatste code? (`git pull`)

### Tijdens Taak
- [ ] Blijf ik binnen scope?
- [ ] Maak ik kleine, logische commits?
- [ ] Test ik regelmatig?

### Voor Commit
- [ ] Build slaagt? (`npm run build`)
- [ ] Lint slaagt? (`npm run lint`)
- [ ] Geen console.logs achtergelaten?
- [ ] Geen hardcoded test data?
- [ ] Commit message is duidelijk?

### Na Deployment
- [ ] Werkt het op productie?
- [ ] Geen errors in Vercel logs?
- [ ] Getest op echte device?

---

## 🆘 Als Je Vast Zit

### Doe Dit
1. Lees de error message goed
2. Google de error
3. Check of het lokaal werkt
4. Vraag om hulp MET context

### Doe Dit NIET
1. Random dingen proberen
2. Code copy-pasten zonder te begrijpen
3. Hele files overschrijven
4. Force push naar main

---

## 📚 Belangrijke Bestanden

```
vysionhoreca-website/
├── src/
│   ├── app/              # Pagina's (Next.js App Router)
│   │   ├── shop/[tenant]/ # Shop pagina's per klant
│   │   ├── keuken/        # Keuken display
│   │   └── api/           # API routes
│   ├── components/        # Herbruikbare componenten
│   ├── lib/               # Utilities en helpers
│   └── i18n/              # Vertalingen setup
├── messages/              # Vertaling bestanden (9 talen)
├── public/                # Statische bestanden
└── supabase/              # Database migrations
```

---

## 🏁 Samenvatting

| Principe | Actie |
|----------|-------|
| **Fix echt** | Oorzaak vinden, niet pleisters |
| **Test altijd** | Build, lint, handmatig |
| **Commit klein** | 1 verandering per commit |
| **Blijf in scope** | Raak niet aan wat niet moet |
| **Documenteer** | Duidelijke commits en communicatie |
| **Vraag bij twijfel** | Beter vragen dan breken |

---

> **Onthoud:** Kwaliteit > Snelheid. Een goede fix die langer duurt is beter dan een snelle pleister die later problemen geeft.

---

*Laatst bijgewerkt: Januari 2026*
