# Vercel Deployment Not Found - Oplossing

## Probleem

Je krijgt twee fouten:
1. **404 DEPLOYMENT_NOT_FOUND** - Vercel kan de deployment niet vinden
2. **SSL Certificate Error** - Certificaat werkt niet

## Oorzaak

Het domain `*.ordervysion.com` is waarschijnlijk niet gekoppeld aan het juiste Vercel project.

## Oplossing Stap-voor-Stap

### Stap 1: Check Project Koppeling

1. Ga naar Vercel Dashboard
2. Selecteer je project: **`vysionhoreca-website`**
3. Ga naar **Settings** → **Domains**
4. Check of je ziet:
   - `ordervysion.com` ✅
   - `*.ordervysion.com` ✅

**Als `*.ordervysion.com` er NIET staat:**
- Klik **"Add Domain"**
- Typ: `*.ordervysion.com`
- Klik **"Add"**
- **BELANGRIJK:** Zorg dat het aan **dit project** is gekoppeld!

### Stap 2: Check Domain Ownership

1. In Vercel → Settings → Domains
2. Klik op `*.ordervysion.com`
3. Check of het zegt:
   - **"Project: vysionhoreca-website"** ✅
   - Als het een ander project zegt, klik op **"Change Project"** en selecteer `vysionhoreca-website`

### Stap 3: Check Recent Deployment

1. Ga naar Vercel → je project → **Deployments**
2. Check of er een recente deployment is
3. Als er geen deployment is, trigger een nieuwe:
   - Push naar GitHub (als je auto-deploy hebt)
   - Of klik **"Redeploy"** op de laatste deployment

### Stap 4: Forceer Nieuwe Deployment

Als het nog steeds niet werkt:

1. Ga naar Vercel → je project
2. Klik op **"Deployments"**
3. Klik op de laatste deployment
4. Klik **"Redeploy"**
5. Wacht tot deployment klaar is
6. Test opnieuw: `https://frituur-rudi.ordervysion.com`

### Stap 5: Verwijder en Voeg Opnieuw Toe

Als niets werkt:

1. In Vercel → Settings → Domains
2. Klik op `*.ordervysion.com`
3. Klik op **"Remove"** of **"Delete"**
4. Wacht 5 minuten
5. Klik **"Add Domain"**
6. Typ: `*.ordervysion.com`
7. **BELANGRIJK:** Selecteer project: **`vysionhoreca-website`**
8. Klik **"Add"**
9. Wacht 10-30 minuten voor SSL certificaat

## Check Lijst

- [ ] `*.ordervysion.com` staat in Vercel → Settings → Domains
- [ ] `*.ordervysion.com` is gekoppeld aan project `vysionhoreca-website`
- [ ] Er is een recente deployment (niet ouder dan 1 dag)
- [ ] Deployment status is "Ready" of "Building"
- [ ] SSL certificaat status is "Valid" (kan 30 min duren)

## Testen

Na alle stappen:
1. Wacht 10-30 minuten
2. Test: `https://frituur-rudi.ordervysion.com`
3. Als het nog steeds niet werkt, test: `http://frituur-rudi.ordervysion.com` (zonder 's')

## Als Niets Werkt

1. **Check Vercel Logs:**
   - Ga naar Vercel → je project → **Logs**
   - Kijk of er errors zijn

2. **Check Middleware:**
   - De middleware in `src/middleware.ts` moet `ordervysion.com` detecteren
   - Dit staat er al in (regel 30)

3. **Contact Vercel Support:**
   - Als het na 24 uur nog steeds niet werkt
   - Geef deployment ID: `fra1::6zqk2-1768755418398-47279564de8a`
