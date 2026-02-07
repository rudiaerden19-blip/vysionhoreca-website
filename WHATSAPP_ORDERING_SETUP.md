# WhatsApp Ordering System - Vysion

## Overzicht

Vysion heeft nu een WhatsApp bestelsysteem waarmee klanten kunnen bestellen via WhatsApp. Orders komen automatisch binnen op het keuken scherm.

---

## Wat is gebouwd

### 1. API Endpoints

**`/api/whatsapp/webhook`** (POST & GET)
- Ontvangt berichten van WhatsApp
- Verwerkt bestellingen
- Stuurt antwoorden naar klanten

**`/api/whatsapp/send-status`** (POST)
- Stuurt order status updates naar klanten
- Wordt aangeroepen vanuit keuken scherm

### 2. Admin Pagina

**`/shop/[tenant]/admin/whatsapp`**
- WhatsApp instellingen configureren
- Phone Number ID en Access Token invullen
- QR code genereren en printen
- Aan/uit schakelaar

### 3. Database Tabellen

```sql
-- whatsapp_settings: Instellingen per tenant
- phone_number_id (Meta API ID)
- access_token (Meta Bearer token)
- whatsapp_number (Echte nummer voor QR code)
- is_active
- welcome_message, ready_message, etc.

-- whatsapp_sessions: Gesprekken met klanten
- phone (klant nummer)
- state (welcome, browsing, checkout, etc.)
- cart (JSON winkelwagen)
- data (naam, notities, etc.)
```

### 4. Keuken Integratie

- Bij "Klaar" knop wordt automatisch WhatsApp bericht gestuurd
- Orders van WhatsApp hebben `source: 'whatsapp'`

---

## Meta Developer Setup (IN PROGRESS)

### Huidige Status
- ✅ Meta Developer account aangemaakt
- ✅ Business Portfolio "Vysion" aangemaakt  
- ✅ App "Vysion Ordering" aangemaakt
- ✅ WhatsApp Business Platform toegevoegd
- ✅ Access Token gegenereerd (tijdelijk, 24 uur geldig)
- 🔄 Webhook moet nog geconfigureerd worden
- 🔄 Permanent token moet nog aangemaakt worden

### Credentials (TIJDELIJK - 24 uur geldig)

```
Phone Number ID: 102703134715030
WhatsApp Business Account ID: 798714469903435
Test Phone Number: +1 555 172 5626

Access Token (tijdelijk):
EAANJrZAFW6ccBQs1SMdqXuCJGM3SFCcdlg9kXpJ7wbrokhjQL45dZCHHxfmVgYV4uZBzXT7rmZwwmZCKQtKIr1bYkxuOM7gYezesh8ZyYyIyU4YwMUdgQ9QwHUAGGMkfX9DEWM0a9TYlcJkAeeQ2h43DMO4gNu3nJEbY0Ut2lcPy9NbOcfpz3XGfcRLG9DTSFth60rx7rfQnZCdMtASkIxVzHJWw2H8kFyG4z3kahhIrsH2IAdPDJgCfkPIlHpuQW6J6L5boz97D1Li8LacUMuwn4n7ZBMngZDZD
```

### Webhook Configuratie (NOG TE DOEN)

In Meta Developer Console → Configuration:

```
Callback URL: https://vysionhoreca.com/api/whatsapp/webhook
Verify Token: vysionwhatsappverify2024
```

Subscribe to:
- messages
- message_status

### Vercel Environment Variables (NOG TE DOEN)

```
WHATSAPP_VERIFY_TOKEN=vysionwhatsappverify2024
```

---

## Hoe het werkt

### Klant Flow

```
1. Klant scant QR code (wa.me/NUMMER?text=Hallo)
2. WhatsApp opent met pre-filled bericht
3. Klant stuurt "Hallo"
4. Bot antwoordt met welkomstbericht + menu knoppen
5. Klant bladert door categorieën/producten
6. Klant voegt items toe aan winkelwagen
7. Klant checkt uit (naam, bevestiging)
8. Order wordt aangemaakt in database
9. Order verschijnt op keuken scherm
10. Eigenaar klikt "Klaar" → WhatsApp notificatie naar klant
```

### Bot States

- `welcome` - Eerste bericht, wacht op actie
- `browsing` - Klant bekijkt menu
- `awaiting_name` - Wacht op klantnaam
- `awaiting_phone_confirm` - Bevestig telefoonnummer
- `awaiting_notes` - Vraagt om opmerkingen
- `awaiting_payment` - Kies betaalmethode
- `completed` - Bestelling geplaatst

---

## Nog te doen

### Hoge prioriteit
1. **Webhook configureren in Meta** - Callback URL + Verify Token
2. **Permanent Access Token maken** - Huidige token verloopt na 24 uur
3. **Vercel env variable toevoegen** - WHATSAPP_VERIFY_TOKEN
4. **Testen met echt WhatsApp nummer**

### Later
- Eigen WhatsApp Business nummer toevoegen (niet test nummer)
- Business verificatie voltooien
- Product opties ondersteuning (sauzen, groottes)
- Online betaling integratie

---

## Bestanden

```
src/app/api/whatsapp/
├── webhook/route.ts          # Hoofdlogica voor berichten
└── send-status/route.ts      # Status updates sturen

src/app/shop/[tenant]/admin/
└── whatsapp/page.tsx         # Admin instellingen pagina

supabase/
└── whatsapp_tables.sql       # Database migratie (UITGEVOERD)

src/app/keuken/[tenant]/page.tsx  # Aangepast voor WhatsApp notificaties
```

---

## Prijsmodel

- Eerste 1000 berichten/maand: **GRATIS**
- Daarna: ~€0.03 per bericht
- WhatsApp alleen bij Pro plan (€69/maand)
- Meeste kleine zaken blijven onder 1000 berichten

---

## Volgende stappen voor agent

1. Open https://developers.facebook.com/apps
2. Selecteer "Vysion Ordering" app
3. Ga naar Configuration → Webhooks
4. Vul in:
   - Callback URL: `https://vysionhoreca.com/api/whatsapp/webhook`
   - Verify Token: `vysionwhatsappverify2024`
5. Klik "Verify and save"
6. Subscribe to "messages"
7. Voeg WHATSAPP_VERIFY_TOKEN toe in Vercel
8. Test met een echte bestelling
