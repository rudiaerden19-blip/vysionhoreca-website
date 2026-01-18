# DNS Configuratie Stap-voor-Stap

## Stap 1: In Vercel (DOE DIT EERST!)

1. Ga naar [vercel.com](https://vercel.com) en log in
2. Selecteer je project (`vysionhoreca-website`)
3. Ga naar **Settings** → **Domains**
4. Klik op **Add Domain**
5. Typ: `ordervysion.com` en klik **Add**
6. Klik opnieuw **Add Domain**
7. Typ: `*.ordervysion.com` en klik **Add**
8. **BELANGRIJK:** Noteer de nameservers die Vercel geeft:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
   (Of andere die Vercel specifiek voor jouw account geeft)

## Stap 2: Bij je Domain Registrar (waar je nu bent)

### Optie A: Als je "Nameservers" of "DNS Nameservers" ziet

1. Klik op de **drie puntjes (⋮)** naast `ordervysion.com`
2. Kies **"Nameservers"** of **"DNS Nameservers"** of **"Manage Nameservers"**
3. Wijzig naar **Custom Nameservers**
4. Voer in:
   - Nameserver 1: `ns1.vercel-dns.com`
   - Nameserver 2: `ns2.vercel-dns.com`
5. Klik **Save** of **Update**

### Optie B: Als je alleen "Manage DNS" of "DNS Records" ziet

1. Klik op de **drie puntjes (⋮)** naast `ordervysion.com`
2. Kies **"Manage DNS"** of **"DNS Settings"**
3. Zoek naar een sectie **"Nameservers"** bovenaan
4. Wijzig naar **Custom Nameservers**
5. Voer in:
   - Nameserver 1: `ns1.vercel-dns.com`
   - Nameserver 2: `ns2.vercel-dns.com`
6. Klik **Save**

### Optie C: Als je geen nameservers kunt wijzigen

Als je nameservers niet kunt wijzigen (bijv. bij Cloudflare met proxy aan):

1. Blijf op je huidige nameservers
2. Voeg deze DNS records toe:
   - Type: **NS** | Name: `_acme-challenge` | Value: `ns1.vercel-dns.com`
   - Type: **NS** | Name: `_acme-challenge` | Value: `ns2.vercel-dns.com`
   - Type: **CNAME** | Name: `*` | Value: `cname.vercel-dns.com`

## Stap 3: Wachten op DNS Propagation

- DNS wijzigingen kunnen 5 minuten tot 48 uur duren
- Meestal werkt het binnen 1-2 uur
- Je kunt checken met: [whatsmydns.net](https://www.whatsmydns.net/#NS/ordervysion.com)

## Stap 4: Testen

Na DNS propagation:
1. Test: `https://frituur-rudi.ordervysion.com` (of een andere tenant)
2. Test: `https://www.frituur-rudi.ordervysion.com`
3. Beide moeten werken!

## Troubleshooting

**Probleem:** Nameservers worden niet geaccepteerd
- **Oplossing:** Controleer of je de juiste nameservers van Vercel hebt gebruikt (check in Vercel dashboard)

**Probleem:** Domain werkt niet na 2+ uur
- **Oplossing:** Check DNS propagation op [whatsmydns.net](https://www.whatsmydns.net/#NS/ordervysion.com)
- Zorg dat nameservers overal `ns1.vercel-dns.com` en `ns2.vercel-dns.com` tonen

**Probleem:** SSL certificaat werkt niet
- **Oplossing:** Wacht langer (tot 48 uur) of gebruik de nameservers methode (niet CNAME)
