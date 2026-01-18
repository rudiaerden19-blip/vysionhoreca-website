# SSL Certificaat Fout Oplossen

## Probleem: "This Connection Is Not Private"

Dit betekent dat het SSL-certificaat voor de subdomain nog niet actief is.

## Oplossing Stap-voor-Stap

### Stap 1: Check Vercel Domains

1. Ga naar Vercel → je project → **Settings** → **Domains**
2. Controleer of je ziet:
   - ✅ `ordervysion.com`
   - ✅ `*.ordervysion.com`

**Als `*.ordervysion.com` er NIET staat:**
- Klik **"Add Domain"**
- Typ: `*.ordervysion.com`
- Klik **"Add"**
- Wacht 5-10 minuten

### Stap 2: Check SSL Certificaten

1. In Vercel → Settings → Domains
2. Klik op `ordervysion.com`
3. Scroll naar **"SSL Certificates"** sectie
4. Check of er een certificaat staat voor `*.ordervysion.com`

**Als er geen certificaat staat:**
- Vercel genereert automatisch SSL-certificaten
- Dit kan 5-30 minuten duren
- Soms tot 24 uur voor wildcard certificaten

### Stap 3: Forceer SSL Certificaat Generatie

Als het certificaat niet automatisch wordt gegenereerd:

1. In Vercel → Settings → Domains
2. Klik op `*.ordervysion.com`
3. Klik op **"Configure"** (tandwiel icoon)
4. Zoek naar **"SSL"** of **"Certificate"**
5. Klik op **"Generate Certificate"** of **"Request Certificate"**

### Stap 4: Wachten op Certificate Propagation

- SSL-certificaten hebben tijd nodig om te worden uitgegeven
- Wildcard certificaten kunnen langer duren (tot 24 uur)
- Check na 30 minuten opnieuw

### Stap 5: Testen

Na certificaat generatie:
1. Wacht 10-30 minuten
2. Test opnieuw: `https://frituur-rudi.ordervysion.com`
3. Als het nog steeds niet werkt, probeer:
   - Hard refresh: `Cmd+Shift+R` (Mac) of `Ctrl+Shift+R` (Windows)
   - Incognito/Private browsing mode
   - Andere browser

## Alternatieve Oplossing: Gebruik Path-Based URLs Tijdelijk

Als SSL-certificaten te lang duren, kun je tijdelijk de oude URLs gebruiken:
- `https://www.vysionhoreca.com/shop/frituur-rudi`

De middleware werkt ook met path-based URLs, dus dit blijft werken.

## Troubleshooting

**Probleem:** Certificaat wordt niet gegenereerd
- **Oplossing:** Check of DNS correct is ingesteld. SSL-certificaten vereisen correcte DNS.

**Probleem:** Certificaat is "Pending" of "Issuing"
- **Oplossing:** Wacht langer. Dit kan tot 24 uur duren voor wildcard certificaten.

**Probleem:** Certificaat fout blijft bestaan na 24 uur
- **Oplossing:** 
  1. Verwijder `*.ordervysion.com` uit Vercel
  2. Wacht 5 minuten
  3. Voeg opnieuw toe: `*.ordervysion.com`
  4. Wacht opnieuw op certificaat generatie

## Check DNS Propagation

Zorg dat DNS correct is:
- Ga naar [whatsmydns.net](https://www.whatsmydns.net/#A/frituur-rudi.ordervysion.com)
- Typ: `frituur-rudi.ordervysion.com`
- Check of het naar Vercel IP's wijst

## Belangrijk

- SSL-certificaten worden automatisch gegenereerd door Vercel
- Dit gebeurt via Let's Encrypt
- Wildcard certificaten (`*.ordervysion.com`) hebben meer tijd nodig
- Je hoeft niets handmatig te configureren, alleen wachten
