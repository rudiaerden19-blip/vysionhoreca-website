# Subdomain Testen

## ✅ Alles is al klaar!

Omdat je `ordervysion.com` bij Vercel hebt gekocht:
- ✅ Nameservers zijn automatisch ingesteld
- ✅ Wildcard DNS record staat er al (`*` → `cname.vercel-dns-016.com.`)
- ✅ Middleware ondersteunt `ordervysion.com` subdomains

## 🧪 Testen

### Stap 1: Check of `*.ordervysion.com` in Vercel staat

1. Ga naar Vercel → je project → Settings → Domains
2. Controleer of je ziet:
   - `ordervysion.com`
   - `*.ordervysion.com`

Als `*.ordervysion.com` er niet staat:
- Klik "Add Domain"
- Typ: `*.ordervysion.com`
- Klik "Add"

### Stap 2: Test met een bestaande tenant

1. Log in bij je admin dashboard
2. Zoek een tenant_slug (bijv. `frituur-rudi`)
3. Test in browser:
   - `https://frituur-rudi.ordervysion.com`
   - `https://www.frituur-rudi.ordervysion.com`

### Stap 3: Als het niet werkt

**Check DNS propagation:**
- Ga naar [whatsmydns.net](https://www.whatsmydns.net/#A/frituur-rudi.ordervysion.com)
- Typ: `frituur-rudi.ordervysion.com`
- Check of het naar Vercel IP's wijst

**Check Vercel deployment:**
- Ga naar Vercel → je project → Deployments
- Zorg dat laatste deployment succesvol is

**Check middleware:**
- De middleware in `src/middleware.ts` moet `ordervysion.com` detecteren
- Dit staat er al in (regel 30)

## 📝 Voorbeeld URLs

Na configuratie werken deze URLs:
- `https://frituur-rudi.ordervysion.com` → tenant shop
- `https://www.frituur-rudi.ordervysion.com` → tenant shop  
- `https://frituur-rudi.ordervysion.com/admin` → tenant admin
- `https://frituur-rudi.ordervysion.com/menu` → tenant menu

Allemaal korter dan: `https://www.vysionhoreca.com/shop/frituur-rudi/admin` ✅
