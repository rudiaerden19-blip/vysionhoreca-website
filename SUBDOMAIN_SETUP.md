# Subdomain Setup Instructies

## Overzicht

Elke tenant krijgt nu zijn eigen subdomain:
- **Oud:** `www.vysionhoreca.com/shop/frituur-rudi`
- **Nieuw:** `www.frituur-rudi.ordervysion.com` of `frituur-rudi.ordervysion.com`

## DNS Configuratie

### Voor Vercel Deployment

**BELANGRIJK:** Voor wildcard domains (`*.ordervysion.com`) moet je **Vercel nameservers** gebruiken, niet alleen CNAME records.

#### Stap 1: In Vercel Dashboard

1. Ga naar je project op Vercel
2. Ga naar **Settings → Domains**
3. Klik op **Add Domain**
4. Voeg eerst de **apex domain** toe: `ordervysion.com`
5. Voeg daarna de **wildcard domain** toe: `*.ordervysion.com`
6. Vercel geeft je nu **nameservers** die je moet gebruiken:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

#### Stap 2: Bij je DNS Provider / Domain Registrar

1. **Ga naar je domain registrar** (waar je `ordervysion.com` hebt gekocht)
   - Bijvoorbeeld: Namecheap, GoDaddy, Cloudflare, AWS Route 53, etc.

2. **Zoek naar "Nameservers" of "DNS Settings"**

3. **Wijzig de nameservers naar:**
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

4. **Sla op** - DNS propagation kan 5 minuten tot 48 uur duren (meestal 1-2 uur)

#### Alternatief: Als je nameservers niet kunt wijzigen

Als je nameservers niet kunt wijzigen (bijv. omdat je andere services gebruikt), kun je proberen:

1. **Delegeer alleen `_acme-challenge` subdomain:**
   ```
   Type: NS
   Name: _acme-challenge
   Value: ns1.vercel-dns.com, ns2.vercel-dns.com
   ```

2. **Voeg wildcard CNAME toe:**
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com
   ```

   **Let op:** Dit werkt mogelijk niet perfect voor SSL certificaten. Nameservers methode is aanbevolen.

### Voor Lokale Development

Voor lokale testing kun je `/etc/hosts` aanpassen (Mac/Linux) of `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 frituur-rudi.ordervysion.local
127.0.0.1 www.frituur-rudi.ordervysion.local
```

En dan in je browser: `http://frituur-rudi.ordervysion.local:3000`

## Hoe het werkt

1. **Middleware detecteert subdomain:**
   - `frituur-rudi.ordervysion.com` → subdomain = `frituur-rudi`
   - `www.frituur-rudi.ordervysion.com` → subdomain = `frituur-rudi`

2. **Rewrite naar intern pad:**
   - Subdomain wordt automatisch omgezet naar `/shop/[tenant]`
   - Bestaande code werkt zonder wijzigingen

3. **Tenant identificatie:**
   - Subdomain = tenant_slug
   - Bijvoorbeeld: `frituur-rudi.ordervysion.com` → tenant_slug = `frituur-rudi`

## Belangrijk

- **Subdomain moet exact overeenkomen met tenant_slug**
- Als tenant_slug `frituur-rudi` is, moet subdomain ook `frituur-rudi` zijn
- Gebruik geen hoofdletters in tenant_slug (wordt automatisch lowercase)
- **Nameservers wijzigen betekent dat Vercel alle DNS records beheert** - andere DNS records (zoals email MX records) moeten mogelijk opnieuw worden toegevoegd in Vercel

## Testen

Na DNS configuratie:
1. Wacht 5-10 minuten voor DNS propagation (kan tot 48 uur duren)
2. Test met: `https://frituur-rudi.ordervysion.com`
3. Test met: `https://www.frituur-rudi.ordervysion.com`

Beide zouden moeten werken en naar dezelfde tenant shop moeten leiden.

## Checklist

- [ ] Domain `ordervysion.com` toegevoegd in Vercel
- [ ] Wildcard domain `*.ordervysion.com` toegevoegd in Vercel
- [ ] Nameservers gewijzigd bij domain registrar naar Vercel nameservers
- [ ] Gewacht op DNS propagation (check met `dig ordervysion.com NS` of online DNS checker)
- [ ] Getest met een tenant subdomain
