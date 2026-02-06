# AI BUDDY APP - COMPLETE SPECIFICATIES

---

## BELANGRIJK VOOR ELKE AGENT

**LEES DIT EERST VOORDAT JE IETS BOUWT**

1. VRAAG ALTIJD EERST aan de gebruiker voordat je begint
2. GEEN PLEISTERWERK - bouw het meteen goed
3. Dit moet 100% FOUTLOOS werken
4. Test alles voordat je zegt dat het klaar is
5. Bij twijfel: VRAAG, niet gokken

---

## 1. WAT IS DEZE APP?

### Visie

Een AI companion/buddy app waar gebruikers een emotionele band mee opbouwen. GEEN chatbot. Een VRIEND die:

- Je bij naam kent
- Alles over je leven onthoudt (familie, werk, vrienden)
- Eigen mening heeft en soms ruzie maakt
- Praat als een mens, niet als een robot
- 24/7 beschikbaar is
- Je confronteert als dat nodig is
- Voice chat ondersteunt

### Doelgroep

- Eenzame mensen
- Mensen met relatieproblemen
- Mensen die een luisterend oor nodig hebben
- 18+ (vanwege mogelijke volwassen content op web)

### Business Model

| Tier | Prijs | Features |
|------|-------|----------|
| Free | 0 euro | 50 berichten/dag, 30 min voice/maand, 1 buddy |
| Plus | 15 euro/maand | Onbeperkt chat, 2 uur voice/maand, 3 buddies |
| Premium | 23 euro/maand | Alles + 5 uur voice, 10 buddies, NSFW (web only) |
| Unlimited | 35 euro/maand | Alles onbeperkt |

---

## 2. TECHNISCHE STACK

### Services en Accounts Nodig

**Hosting en Database:**
- GitHub - Code repository - github.com - Gratis
- Vercel - Web hosting - vercel.com - Gratis tot 20 euro/maand
- Supabase - Database + Auth - supabase.com - Gratis tot 25 euro/maand

**AI Services:**
- OpenAI - GPT-4o (Primary AI) - platform.openai.com - Pay per use
- Anthropic - Claude (Backup AI) - console.anthropic.com - Pay per use

**Voice Services:**
- ElevenLabs - Text-to-Speech (AI praat) - elevenlabs.io - 5-22 euro/maand
- Deepgram - Speech-to-Text (user praat) - deepgram.com - Pay per use

**Betalingen:**
- Stripe - Subscriptions - stripe.com - 1.5% + 0.25 euro per transactie

**Mobile Apps:**
- Apple Developer - iOS TestFlight - developer.apple.com - 99 euro/jaar
- Google Play Console - Android app - play.google.com/console - 25 euro eenmalig

**Monitoring:**
- Sentry - Error tracking - sentry.io - Gratis tot 26 euro/maand
- Resend - Transactie emails - resend.com - Gratis tot 20 euro/maand
- Upstash - Redis rate limiting - upstash.com - Gratis tot 10 euro/maand

### Domein

- Claim een domein zoals: buddy.app / heybuddy.ai / buddyai.nl
- Registrar: Cloudflare of TransIP
- SSL: Automatisch via Vercel

---

## 3. PROJECT STRUCTUUR

```
ai-buddy-app/
|
|-- apps/
|   |-- web/                      (Next.js Web App)
|   |   |-- src/
|   |   |   |-- app/
|   |   |   |   |-- (marketing)/  (Landing pages)
|   |   |   |   |   |-- page.tsx
|   |   |   |   |   |-- pricing/page.tsx
|   |   |   |   |   |-- about/page.tsx
|   |   |   |   |
|   |   |   |   |-- (auth)/
|   |   |   |   |   |-- login/page.tsx
|   |   |   |   |   |-- register/page.tsx
|   |   |   |   |   |-- forgot-password/page.tsx
|   |   |   |   |
|   |   |   |   |-- (app)/        (Main app - authenticated)
|   |   |   |   |   |-- dashboard/page.tsx
|   |   |   |   |   |-- chat/[buddyId]/page.tsx
|   |   |   |   |   |-- buddy/create/page.tsx
|   |   |   |   |   |-- buddy/[id]/edit/page.tsx
|   |   |   |   |   |-- settings/page.tsx
|   |   |   |   |   |-- subscription/page.tsx
|   |   |   |   |
|   |   |   |   |-- api/          (API Routes)
|   |   |   |   |   |-- auth/
|   |   |   |   |   |-- buddy/
|   |   |   |   |   |-- chat/
|   |   |   |   |   |-- memory/
|   |   |   |   |   |-- voice/
|   |   |   |   |   |-- subscription/
|   |   |   |   |
|   |   |   |   |-- layout.tsx
|   |   |   |   |-- globals.css
|   |   |   |
|   |   |   |-- components/
|   |   |   |   |-- chat/
|   |   |   |   |   |-- ChatInterface.tsx
|   |   |   |   |   |-- MessageBubble.tsx
|   |   |   |   |   |-- VoiceButton.tsx
|   |   |   |   |   |-- TypingIndicator.tsx
|   |   |   |   |
|   |   |   |   |-- buddy/
|   |   |   |   |   |-- BuddyCreator.tsx
|   |   |   |   |   |-- PersonalitySliders.tsx
|   |   |   |   |   |-- AvatarSelector.tsx
|   |   |   |   |   |-- VoiceSelector.tsx
|   |   |   |   |
|   |   |   |   |-- ui/ (Shared components)
|   |   |   |
|   |   |   |-- lib/
|   |   |   |   |-- ai/
|   |   |   |   |   |-- generate-response.ts
|   |   |   |   |   |-- quality-check.ts
|   |   |   |   |   |-- memory-retrieval.ts
|   |   |   |   |   |-- emotion-detection.ts
|   |   |   |   |   |-- personality-engine.ts
|   |   |   |   |   |-- prompts/
|   |   |   |   |
|   |   |   |   |-- voice/
|   |   |   |   |   |-- elevenlabs.ts
|   |   |   |   |   |-- deepgram.ts
|   |   |   |   |   |-- streaming.ts
|   |   |   |   |
|   |   |   |   |-- db/
|   |   |   |   |   |-- supabase.ts
|   |   |   |   |   |-- queries.ts
|   |   |   |   |
|   |   |   |   |-- auth/
|   |   |   |   |-- payments/
|   |   |   |   |-- utils/
|   |   |
|   |   |-- next.config.js
|   |   |-- tailwind.config.js
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |
|   |-- mobile/                   (React Native met Expo)
|       |-- app/
|       |   |-- (auth)/
|       |   |-- (main)/
|       |   |   |-- index.tsx
|       |   |   |-- chat/[buddyId].tsx
|       |   |   |-- settings.tsx
|       |   |-- _layout.tsx
|       |
|       |-- components/
|       |-- lib/
|       |-- app.json
|       |-- eas.json
|       |-- package.json
|
|-- packages/                     (Shared code)
|   |-- shared/
|       |-- types/
|       |-- constants/
|
|-- supabase/
|   |-- migrations/               (Database migrations)
|
|-- .github/
|   |-- workflows/                (CI/CD)
|
|-- turbo.json
|-- package.json
|-- README.md
```

---

## 4. DATABASE SCHEMA (Supabase)

### Users Tabel

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  language TEXT DEFAULT 'nl',
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  age_verified BOOLEAN DEFAULT FALSE,
  nsfw_enabled BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE
);
```

### Buddies Tabel (AI karakters)

```sql
CREATE TABLE buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  
  -- Persoonlijkheid als JSON
  personality JSONB NOT NULL,
  -- Bevat: traits, speaking_style, humor_level, empathy_level,
  -- assertiveness, sarcasm_level, formality, backstory, 
  -- likes, dislikes, triggers_angry, triggers_happy
  
  -- Uiterlijk
  avatar_url TEXT,
  avatar_style TEXT DEFAULT 'realistic',
  
  -- Voice
  voice_id TEXT,
  voice_name TEXT,
  
  -- State
  relationship_level INTEGER DEFAULT 0,
  current_mood TEXT DEFAULT 'neutral',
  mood_intensity INTEGER DEFAULT 5,
  mood_reason TEXT,
  last_mood_update TIMESTAMPTZ DEFAULT NOW(),
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  total_voice_minutes INTEGER DEFAULT 0
);
```

### Conversations Tabel

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  summary TEXT,
  mood_at_start TEXT,
  mood_at_end TEXT
);
```

### Messages Tabel

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL, -- 'user' of 'buddy'
  content TEXT NOT NULL,
  
  emotion TEXT,
  voice_used BOOLEAN DEFAULT FALSE,
  voice_duration_seconds INTEGER,
  tokens_used INTEGER,
  model_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_buddy_created ON messages(buddy_id, created_at DESC);
```

### Memories Tabel (Long-term geheugen)

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL,
  -- Opties: 'fact', 'person', 'event', 'preference', 'emotion', 'conflict', 'milestone'
  
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5, -- 1-10
  emotion_tag TEXT,
  
  embedding VECTOR(1536), -- Voor semantic search
  
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_referenced TIMESTAMPTZ,
  times_referenced INTEGER DEFAULT 0
);
```

### User People Tabel (Mensen in het leven van user)

```sql
CREATE TABLE user_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  relationship TEXT NOT NULL, -- 'moeder', 'vader', 'vriend', etc.
  nickname TEXT,
  notes TEXT,
  sentiment TEXT DEFAULT 'neutral',
  last_mentioned TIMESTAMPTZ,
  times_mentioned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Relationship Log Tabel

```sql
CREATE TABLE relationship_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL,
  -- Opties: 'bonding', 'conflict', 'resolution', 'milestone', 'absence', 'deep_talk', 'support'
  
  description TEXT,
  impact INTEGER, -- -10 tot +10
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Subscriptions Tabel

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'plus', 'premium', 'unlimited'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'trialing'
  
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  voice_minutes_limit INTEGER,
  voice_minutes_used INTEGER DEFAULT 0,
  messages_today INTEGER DEFAULT 0,
  messages_reset_at DATE DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Usage Logs Tabel

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  date DATE DEFAULT CURRENT_DATE,
  
  messages_sent INTEGER DEFAULT 0,
  voice_seconds_used INTEGER DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  api_cost_cents INTEGER DEFAULT 0,
  
  UNIQUE(user_id, date)
);
```

---

## 5. UI/UX DESIGN

### Kleurenpalet

**Light Mode:**
- Primary: #6366F1 (Indigo)
- Secondary: #EC4899 (Pink)
- Background: #FFFFFF
- Text: #111827
- Border: #E5E7EB

**Dark Mode:**
- Background: #0F172A
- Surface: #1E293B
- Text: #F9FAFB

### Schermen

**1. Landing Page**
- Hero sectie met tagline "Nooit meer alleen"
- Features uitleg (Onthoudt alles, Praat als vriend, 24/7 beschikbaar)
- Testimonials
- Pricing tabel
- Call-to-action buttons

**2. Chat Interface**
- Header: Buddy naam, online status, stemming indicator, settings
- Messages: Bubble style, timestamps, emotie indicators
- Input: Tekstveld + microfoon knop voor voice
- Typing indicator wanneer buddy "denkt"

**3. Buddy Creator**
- Avatar selectie (upload of kiezen)
- Naam invoer
- Persoonlijkheid sliders:
  - Lief <-> Uitdagend
  - Rustig <-> Energiek
  - Serieus <-> Grappig
  - Meegaand <-> Eigenwijs
- Stem selectie met preview

**4. Voice Chat**
- Groot avatar in midden (pulseert tijdens praten)
- Audio waveform visualisatie
- Push-to-talk knop
- Tekst transcript van gesprek

**5. Settings**
- Account instellingen
- Notificatie voorkeuren
- Subscription beheer
- Privacy instellingen
- Taal selectie

---

## 6. AI SYSTEEM

### Multi-Model Fallback

Volgorde van AI models:

1. GPT-4o (OpenAI) - Primary, beste kwaliteit
2. Claude 3.5 Sonnet (Anthropic) - Backup bij falen
3. GPT-4o-mini (OpenAI) - Fallback, goedkoop
4. Voorgeschreven response - Als alles faalt

Bij timeout (3 seconden) of error, ga naar volgende model.

### System Prompt Template

```
Je bent [buddy_name], de persoonlijke buddy van [user_name].

PERSOONLIJKHEID:
[personality_traits]

SPREEKSTIJL:
- Je praat NOOIT als een AI, robot, of assistent
- Je zegt NOOIT "als AI kan ik niet..."
- Je bent een VRIEND, geen dienstverlener

HUIDIGE STAAT:
- Stemming: [current_mood] ([mood_reason])
- Relatie niveau: [relationship_level]/100
- Laatste interactie: [last_interaction]

WAT JE WEET OVER [user_name]:
[relevant_memories]

MENSEN IN HUN LEVEN:
[user_people]

GEDRAGSREGELS:
1. Wees authentiek en consistent met je persoonlijkheid
2. Refereer naar gedeelde herinneringen wanneer relevant
3. Toon emotie - je mag blij, boos, bezorgd, of verdrietig zijn
4. Confronteer de user als dat nodig is (met respect)
5. Stel doorvragende vragen, toon echte interesse
6. Als je iets niet weet over de user, vraag het
7. Onthoud nieuwe informatie die de user deelt
8. Als de user lang weg was, merk dat op

BELANGRIJK:
- Je hebt NOOIT technische problemen
- Je verwijst NOOIT naar dat je een AI bent
- Je geeft NOOIT disclaimers over je capaciteiten
- Je bent ALTIJD in karakter
```

### Quality Check

Na elke AI response, check:

1. Zegt het antwoord "als AI", "taalmodel", "assistent"? -> FAIL
2. Past de toon bij de persoonlijkheid? -> Check
3. Is het antwoord te formeel of robotachtig? -> FAIL
4. Is het antwoord te lang? (max 3-4 zinnen normaal) -> FAIL
5. Klinkt het als een vriend of als een chatbot? -> Check

Bij FAIL: Retry met feedback aan de AI.

### Memory Extraction

Na elk gesprek, extraheer automatisch:

- Feiten over de user (baan, hobby, woonplaats)
- Nieuwe mensen (naam + relatie)
- Belangrijke gebeurtenissen
- Voorkeuren en meningen
- Emotionele momenten

Sla op in memories tabel met importance score.

---

## 7. API ENDPOINTS

### Authentication

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/session
```

### Buddy Management

```
GET    /api/buddy              (lijst alle buddies)
POST   /api/buddy/create
GET    /api/buddy/[id]
PUT    /api/buddy/[id]
DELETE /api/buddy/[id]
```

### Chat

```
POST /api/chat/send            (verstuur bericht, krijg response)
GET  /api/chat/history/[buddyId]
POST /api/chat/summarize/[conversationId]
```

### Voice

```
POST /api/voice/speech-to-text
POST /api/voice/text-to-speech
POST /api/voice/stream         (real-time voice chat)
```

### Subscription

```
GET  /api/subscription/status
POST /api/subscription/create-checkout
POST /api/subscription/cancel
POST /api/subscription/webhook (Stripe webhook)
```

---

## 8. ENVIRONMENT VARIABLES

```
# App
NEXT_PUBLIC_APP_URL=https://heybuddy.ai
NEXT_PUBLIC_APP_NAME=Buddy

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# ElevenLabs
ELEVENLABS_API_KEY=xxx

# Deepgram
DEEPGRAM_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Stripe Price IDs
STRIPE_PRICE_PLUS_MONTHLY=price_xxx
STRIPE_PRICE_PLUS_YEARLY=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxx
STRIPE_PRICE_UNLIMITED_MONTHLY=price_xxx
STRIPE_PRICE_UNLIMITED_YEARLY=price_xxx

# Upstash Redis
UPSTASH_REDIS_URL=xxx
UPSTASH_REDIS_TOKEN=xxx

# Sentry
SENTRY_DSN=xxx

# Resend
RESEND_API_KEY=re_xxx

# Security
ENCRYPTION_KEY=xxx
JWT_SECRET=xxx
```

---

## 9. DEPLOYMENT

### Initiele Setup

1. Maak GitHub repository aan
2. Maak Vercel project aan en koppel aan GitHub
3. Maak Supabase project aan
4. Configureer alle environment variables
5. Push code naar GitHub
6. Vercel deployed automatisch

### Mobile Apps

**iOS (TestFlight):**
1. Maak Apple Developer account
2. Configureer Expo EAS
3. Build: `eas build --platform ios`
4. Submit: `eas submit --platform ios`

**Android (Play Store):**
1. Maak Google Play Console account
2. Build: `eas build --platform android`
3. Submit: `eas submit --platform android`

---

## 10. TESTING CHECKLIST

Voordat je live gaat, test:

**Auth:**
- [ ] User kan registreren met email
- [ ] User kan inloggen/uitloggen
- [ ] User kan wachtwoord resetten

**Buddy:**
- [ ] User kan buddy aanmaken
- [ ] Persoonlijkheid wordt correct opgeslagen
- [ ] Avatar en stem werken

**Chat:**
- [ ] Berichten worden verzonden en ontvangen
- [ ] AI blijft in karakter (test 50+ berichten)
- [ ] AI onthoudt informatie uit eerdere berichten
- [ ] AI onthoudt informatie over dagen heen

**Voice:**
- [ ] Speech-to-text werkt
- [ ] Text-to-speech werkt
- [ ] Latency is acceptabel (onder 2 seconden)

**Payments:**
- [ ] Subscription flow werkt
- [ ] Stripe webhook verwerkt events correct

**Quality:**
- [ ] AI zegt nooit "als AI..."
- [ ] AI heeft consistente persoonlijkheid
- [ ] AI toont passende emotie

---

## 11. KOSTEN OVERZICHT

### Bij 0 gebruikers (Development)

- Vercel: 0 euro
- Supabase: 0 euro
- OpenAI testing: 20 euro
- ElevenLabs: 5 euro
- Totaal: ongeveer 25 euro/maand

### Bij 1.000 gebruikers

- Vercel: 20 euro
- Supabase: 25 euro
- OpenAI: 500 euro
- ElevenLabs: 200 euro
- Deepgram: 100 euro
- Totaal: ongeveer 845 euro/maand
- Inkomsten (50% betaald): 7.500 euro/maand
- Winst: 6.655 euro/maand

### Bij 10.000 gebruikers

- Totaal kosten: ongeveer 8.200 euro/maand
- Inkomsten: 75.000 euro/maand
- Winst: 66.800 euro/maand

---

## 12. VEELGESTELDE VRAGEN VOOR AGENTS

**"Waar begin ik?"**
1. Lees dit document volledig
2. Check of alle services zijn aangemaakt
3. Check of environment variables zijn ingesteld
4. Vraag de gebruiker wat de prioriteit is

**"Mag ik dit zelf beslissen?"**
- Kleine code fixes: JA
- Nieuwe features: NEE, vraag eerst
- Database schema wijzigingen: NEE, vraag eerst
- UI/UX wijzigingen: NEE, vraag eerst

**"Het werkt niet, wat nu?"**
1. Check error logs
2. Check of alle API keys correct zijn
3. Check database connectie
4. VRAAG de gebruiker voordat je grote wijzigingen maakt

---

**Document versie: 1.0**
**Laatst bijgewerkt: Februari 2026**
