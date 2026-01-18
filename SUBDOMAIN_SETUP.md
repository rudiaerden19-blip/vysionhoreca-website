# Subdomain Setup Instructies

## Overzicht

Elke tenant krijgt nu zijn eigen subdomain:
- **Oud:** `www.vysionhoreca.com/shop/frituur-rudi`
- **Nieuw:** `www.frituur-rudi.ordervysion.com` of `frituur-rudi.ordervysion.com`

## DNS Configuratie

### Voor Vercel Deployment

1. **Ga naar je DNS provider** (waar je `ordervysion.com` domein beheert)

2. **Voeg wildcard DNS record toe:**
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com
   ```
   
   Of voor specifieke subdomains:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **In Vercel Dashboard:**
   - Ga naar je project settings
   - Ga naar "Domains"
   - Voeg `ordervysion.com` toe als custom domain
   - Voeg `*.ordervysion.com` toe als wildcard domain
   - Vercel zal automatisch alle subdomains accepteren

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

## Testen

Na DNS configuratie:
1. Wacht 5-10 minuten voor DNS propagation
2. Test met: `https://frituur-rudi.ordervysion.com`
3. Test met: `https://www.frituur-rudi.ordervysion.com`

Beide zouden moeten werken en naar dezelfde tenant shop moeten leiden.
