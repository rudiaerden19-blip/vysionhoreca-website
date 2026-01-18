# Vercel DNS Configuratie - Status

## ✅ Wat al klaar is in Vercel:

1. **Wildcard DNS Record:** `*` → `cname.vercel-dns-016.com.` ✅
   - Dit betekent dat `*.ordervysion.com` al werkt!

2. **Nameservers:** 
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

## 🔄 Wat je nu moet doen:

### Bij je Domain Registrar (waar je `ordervysion.com` hebt gekocht)

1. Log in bij je domain registrar
2. Ga naar "Domains" of "My Domains"
3. Klik op `ordervysion.com`
4. Zoek naar "Nameservers" of "DNS Nameservers"
5. Wijzig naar:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
6. Sla op

### Veelvoorkomende registrars:

**Namecheap:**
- Domain List → Manage → Advanced DNS → Nameservers → Custom DNS

**GoDaddy:**
- My Products → DNS → Nameservers → Change

**Cloudflare:**
- Domain → DNS → Nameservers (rechtsboven)

**Google Domains:**
- Domain → DNS → Nameservers → Use custom nameservers

## ⏱️ Wachten

Na het wijzigen van nameservers:
- Wacht 1-2 uur (kan tot 48 uur duren)
- Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net/#NS/ordervysion.com)

## ✅ Testen

Na DNS propagation:
- `https://frituur-rudi.ordervysion.com` moet werken
- `https://www.frituur-rudi.ordervysion.com` moet werken
