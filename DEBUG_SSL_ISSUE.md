# SSL Certificaat Debugging

## Als alles al dagen klaar is maar SSL nog steeds niet werkt:

### Stap 1: Check Exacte Foutmelding

Klik op **"Show Details"** in de browser foutmelding en noteer:
- Wat is de exacte foutcode?
- Welke subdomain probeer je te bezoeken?
- Welke browser gebruik je?

### Stap 2: Check Vercel Domain Status

1. Ga naar Vercel → Settings → Domains
2. Klik op `*.ordervysion.com`
3. Check de status:
   - Is het "Valid" of "Pending"?
   - Is er een SSL certificaat zichtbaar?
   - Staat er een foutmelding?

### Stap 3: Check DNS Records

1. In Vercel → Settings → Domains → DNS Records
2. Controleer of je ziet:
   - `*` → `ALIAS` → `cname.vercel-dns-016.com.` (of vergelijkbaar)
   - `@` → `ALIAS` → `cname.vercel-dns-016.com.`

### Stap 4: Test DNS Propagation

Test of DNS correct werkt:
- Ga naar [whatsmydns.net](https://www.whatsmydns.net/#A/frituur-rudi.ordervysion.com)
- Typ je subdomain (bijv. `frituur-rudi.ordervysion.com`)
- Check of het naar Vercel IP's wijst

### Stap 5: Check SSL Certificate Status

1. In Vercel → Settings → Domains
2. Scroll naar **"SSL Certificates"** sectie
3. Check of er een certificaat staat voor `*.ordervysion.com`
4. Check de status: "Valid", "Pending", of "Error"

### Mogelijke Problemen:

**Probleem 1: Certificaat is "Pending"**
- **Oplossing:** Wacht langer of verwijder en voeg opnieuw toe

**Probleem 2: Certificaat is "Error"**
- **Oplossing:** 
  1. Verwijder `*.ordervysion.com` uit Vercel
  2. Wacht 5 minuten
  3. Voeg opnieuw toe: `*.ordervysion.com`
  4. Wacht opnieuw op certificaat

**Probleem 3: DNS wijst niet naar Vercel**
- **Oplossing:** Check DNS records in Vercel

**Probleem 4: Browser cache**
- **Oplossing:** 
  - Hard refresh: `Cmd+Shift+R` (Mac) of `Ctrl+Shift+R` (Windows)
  - Probeer incognito/private browsing
  - Probeer andere browser

**Probleem 5: Vercel project niet gekoppeld**
- **Oplossing:** Check of `ordervysion.com` en `*.ordervysion.com` aan het juiste project zijn gekoppeld

### Test Commando's:

```bash
# Test DNS
dig frituur-rudi.ordervysion.com

# Test SSL certificaat
openssl s_client -connect frituur-rudi.ordervysion.com:443 -servername frituur-rudi.ordervysion.com
```

### Wat te doen als niets werkt:

1. **Verwijder en voeg opnieuw toe:**
   - Verwijder `*.ordervysion.com` uit Vercel
   - Wacht 10 minuten
   - Voeg opnieuw toe
   - Wacht 30 minuten

2. **Contact Vercel Support:**
   - Als het na 24 uur nog steeds niet werkt
   - Vercel kan handmatig certificaten genereren

3. **Tijdelijke oplossing:**
   - Gebruik path-based URLs: `https://www.vysionhoreca.com/shop/frituur-rudi`
   - Deze werken altijd
