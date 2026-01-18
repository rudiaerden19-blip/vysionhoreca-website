# Vercel Domain Setup - Stap voor Stap (ZO EENVOUDIG MOGELIJK)

## 🎯 Wat we gaan doen:
Het domain `*.ordervysion.com` koppelen aan je project zodat subdomains werken.

---

## 📋 STAP 1: Open Vercel

1. Ga naar: **https://vercel.com**
2. Log in met je account
3. Je ziet een lijst met projecten

---

## 📋 STAP 2: Selecteer je Project

1. Zoek in de lijst naar: **`vysionhoreca-website`**
2. **Klik erop** om het project te openen

---

## 📋 STAP 3: Ga naar Settings

1. Bovenin zie je tabs: **"Overview"**, **"Deployments"**, **"Settings"**, etc.
2. **Klik op "Settings"**

---

## 📋 STAP 4: Ga naar Domains

1. Links zie je een menu met: **"General"**, **"Domains"**, **"Environment Variables"**, etc.
2. **Klik op "Domains"**

---

## 📋 STAP 5: Check wat er staat

Je ziet nu een lijst met domains. Check of je ziet:
- `ordervysion.com` ✅
- `*.ordervysion.com` ❓

**Als `*.ordervysion.com` er NIET staat, ga naar STAP 6**

**Als `*.ordervysion.com` er WEL staat maar het werkt niet, ga naar STAP 7**

---

## 📋 STAP 6: Voeg Wildcard Domain Toe

1. **Klik op de grote blauwe knop "Add Domain"** (rechtsboven)
2. Er opent een popup/venster
3. Typ in het tekstveld: **`*.ordervysion.com`**
4. **BELANGRIJK:** Check of er staat "Project: vysionhoreca-website"
   - Als het een ander project zegt, klik op het dropdown menu en selecteer **"vysionhoreca-website"**
5. **Klik op "Add"** of **"Add Domain"**
6. Wacht 10 seconden - je ziet nu `*.ordervysion.com` in de lijst

---

## 📋 STAP 7: Check Project Koppeling

Als `*.ordervysion.com` er al staat:

1. **Klik op `*.ordervysion.com`** in de lijst
2. Check of er staat: **"Project: vysionhoreca-website"**
3. **Als het een ANDER project zegt:**
   - Klik op **"Change Project"** of **"Edit"**
   - Selecteer **"vysionhoreca-website"**
   - Klik **"Save"**

---

## 📋 STAP 8: Trigger Nieuwe Deployment

1. Ga terug naar je project (klik op **"vysionhoreca-website"** bovenaan)
2. Klik op tab **"Deployments"**
3. Je ziet een lijst met deployments
4. **Klik op de MEEST RECENTE deployment** (bovenaan)
5. Je ziet een pagina met deployment details
6. **Klik op de knop "Redeploy"** (rechtsboven, vaak een refresh icoon)
7. Bevestig met **"Redeploy"**
8. Wacht 2-5 minuten tot deployment klaar is (je ziet "Ready" ✅)

---

## 📋 STAP 9: Wacht op SSL Certificaat

1. Ga terug naar **Settings** → **Domains**
2. Klik op `*.ordervysion.com`
3. Scroll naar beneden naar **"SSL Certificates"**
4. Je ziet de status:
   - **"Valid"** ✅ = Klaar!
   - **"Pending"** ⏳ = Wacht nog 10-30 minuten
   - **"Error"** ❌ = Ga naar STAP 10

---

## 📋 STAP 10: Als SSL Certificaat Error Geeft

1. In **Settings** → **Domains**
2. Klik op `*.ordervysion.com`
3. Klik op **"Remove"** of **"Delete"** (rood)
4. Bevestig verwijdering
5. Wacht 5 minuten
6. Ga terug naar **STAP 6** en voeg opnieuw toe

---

## ✅ TESTEN

Na alle stappen:

1. Wacht **30 minuten** (voor SSL certificaat)
2. Open een nieuwe tab in je browser
3. Typ: **`https://frituur-rudi.ordervysion.com`**
4. Druk Enter

**Als het werkt:** Je ziet de tenant shop! ✅

**Als het nog steeds niet werkt:** 
- Wacht nog 30 minuten
- Probeer: `http://frituur-rudi.ordervysion.com` (zonder 's')
- Of gebruik tijdelijk: `https://www.vysionhoreca.com/shop/frituur-rudi`

---

## 🆘 HULP NODIG?

Als je ergens vastloopt, vertel me:
- Bij welke STAP je bent
- Wat je ziet op het scherm
- Wat de foutmelding zegt

Dan help ik je verder! 👍
