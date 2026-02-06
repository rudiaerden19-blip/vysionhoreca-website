# AI BUDDY APP - COMPLETE SPECIFICATIES

## BELANGRIJK VOOR ELKE AGENT

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🚨 LEES DIT EERST VOORDAT JE IETS BOUWT 🚨                        │
│                                                                      │
│   1. VRAAG ALTIJD EERST aan de gebruiker voordat je begint          │
│   2. GEEN PLEISTERWERK - bouw het meteen goed                       │
│   3. Dit moet 100% FOUTLOOS werken                                  │
│   4. Test alles voordat je zegt dat het klaar is                    │
│   5. Bij twijfel: VRAAG, niet gokken                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

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
| Free | €0 | 50 berichten/dag, 30 min voice/maand, 1 buddy |
| Plus | €15/maand | Onbeperkt chat, 2 uur voice/maand, 3 buddies |
| Premium | €23/maand | Alles + 5 uur voice, 10 buddies, NSFW (web only) |
| Unlimited | €35/maand | Alles onbeperkt |

---

## 2. TECHNISCHE STACK

### Services & Accounts Nodig

| Service | Waarvoor | URL | Kosten |
|---------|----------|-----|--------|
| **GitHub** | Code repository | github.com | Gratis |
| **Vercel** | Web hosting & deployment | vercel.com | Gratis - €20/m |
| **Supabase** | Database + Auth | supabase.com | Gratis - €25/m |
| **OpenAI** | AI (GPT-4o) - Primary | platform.openai.com | Pay per use |
| **Anthropic** | AI (Claude) - Backup | console.anthropic.com | Pay per use |
| **ElevenLabs** | Voice synthesis (AI praat) | elevenlabs.io | €5 - €22/m |
| **Deepgram** | Speech-to-text (user praat) | deepgram.com | Pay per use |
| **Stripe** | Betalingen | stripe.com | 1.5% + €0.25/tx |
| **Apple Developer** | iOS TestFlight | developer.apple.com | €99/jaar |
| **Google Play Console** | Android app | play.google.com/console | €25 eenmalig |
| **Sentry** | Error monitoring | sentry.io | Gratis - €26/m |
| **Resend** | Transactie emails | resend.com | Gratis - €20/m |
| **Upstash** | Redis (rate limiting) | upstash.com | Gratis - €10/m |

### Domein
- Claim: buddy.app / heybuddy.ai / buddyai.nl of vergelijkbaar
- Registrar: Cloudflare of TransIP
- SSL: Automatisch via Vercel

---

## 3. PROJECT STRUCTUUR

```
ai-buddy-app/
│
├── apps/
│   ├── web/                      # Next.js Web App
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/  # Landing pages
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── pricing/page.tsx
│   │   │   │   │   └── about/page.tsx
│   │   │   │   │
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── register/page.tsx
│   │   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   │   └── verify-email/page.tsx
│   │   │   │   │
│   │   │   │   ├── (app)/        # Main app (authenticated)
│   │   │   │   │   ├── dashboard/page.tsx
│   │   │   │   │   ├── chat/[buddyId]/page.tsx
│   │   │   │   │   ├── buddy/
│   │   │   │   │   │   ├── create/page.tsx
│   │   │   │   │   │   └── [id]/edit/page.tsx
│   │   │   │   │   ├── settings/page.tsx
│   │   │   │   │   └── subscription/page.tsx
│   │   │   │   │
│   │   │   │   ├── api/          # API Routes
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── buddy/
│   │   │   │   │   ├── chat/
│   │   │   │   │   ├── memory/
│   │   │   │   │   ├── voice/
│   │   │   │   │   └── subscription/
│   │   │   │   │
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── ChatInterface.tsx
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   ├── VoiceButton.tsx
│   │   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   │   └── BuddyMoodIndicator.tsx
│   │   │   │   │
│   │   │   │   ├── buddy/
│   │   │   │   │   ├── BuddyCreator.tsx
│   │   │   │   │   ├── PersonalitySliders.tsx
│   │   │   │   │   ├── AvatarSelector.tsx
│   │   │   │   │   └── VoiceSelector.tsx
│   │   │   │   │
│   │   │   │   └── ui/           # Shared UI components
│   │   │   │
│   │   │   └── lib/
│   │   │       ├── ai/
│   │   │       │   ├── generate-response.ts
│   │   │       │   ├── quality-check.ts
│   │   │       │   ├── memory-retrieval.ts
│   │   │       │   ├── emotion-detection.ts
│   │   │       │   ├── personality-engine.ts
│   │   │       │   └── prompts/
│   │   │       │
│   │   │       ├── voice/
│   │   │       │   ├── elevenlabs.ts
│   │   │       │   ├── deepgram.ts
│   │   │       │   └── streaming.ts
│   │   │       │
│   │   │       ├── db/
│   │   │       │   ├── supabase.ts
│   │   │       │   └── queries.ts
│   │   │       │
│   │   │       ├── auth/
│   │   │       ├── payments/
│   │   │       └── utils/
│   │   │
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                   # React Native (Expo)
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (main)/
│       │   │   ├── index.tsx
│       │   │   ├── chat/[buddyId].tsx
│       │   │   └── settings.tsx
│       │   └── _layout.tsx
│       │
│       ├── components/
│       ├── lib/
│       ├── app.json
│       ├── eas.json
│       └── package.json
│
├── packages/                     # Shared code
│   └── shared/
│       ├── types/
│       └── constants/
│
├── supabase/
│   └── migrations/               # Database migrations
│
├── .github/
│   └── workflows/                # CI/CD
│
├── turbo.json                    # Monorepo config
├── package.json
└── README.md
```

---

## 4. DATABASE SCHEMA (Supabase)

```sql
-- =====================================================
-- USERS TABLE
-- =====================================================
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

-- =====================================================
-- BUDDIES TABLE (AI karakters)
-- =====================================================
CREATE TABLE buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  
  -- Persoonlijkheid
  personality JSONB NOT NULL DEFAULT '{
    "traits": [],
    "speaking_style": "casual",
    "humor_level": 5,
    "empathy_level": 7,
    "assertiveness": 5,
    "sarcasm_level": 3,
    "formality": 2,
    "backstory": "",
    "likes": [],
    "dislikes": [],
    "triggers_angry": [],
    "triggers_happy": []
  }',
  
  -- Uiterlijk
  avatar_url TEXT,
  avatar_style TEXT DEFAULT 'realistic', -- realistic, anime, abstract
  
  -- Voice
  voice_id TEXT, -- ElevenLabs voice ID
  voice_name TEXT,
  
  -- State
  relationship_level INTEGER DEFAULT 0, -- 0-100
  current_mood TEXT DEFAULT 'neutral',
  mood_intensity INTEGER DEFAULT 5, -- 1-10
  mood_reason TEXT,
  last_mood_update TIMESTAMPTZ DEFAULT NOW(),
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  total_voice_minutes INTEGER DEFAULT 0
);

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  summary TEXT, -- AI-generated summary for context
  mood_at_start TEXT,
  mood_at_end TEXT
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'buddy')),
  content TEXT NOT NULL,
  
  -- Metadata
  emotion TEXT, -- Detected/expressed emotion
  voice_used BOOLEAN DEFAULT FALSE,
  voice_duration_seconds INTEGER,
  tokens_used INTEGER,
  model_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast retrieval
CREATE INDEX idx_messages_buddy_created ON messages(buddy_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- =====================================================
-- MEMORIES TABLE (Long-term geheugen)
-- =====================================================
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL CHECK (category IN (
    'fact',        -- Feit over de user
    'person',      -- Persoon in hun leven
    'event',       -- Belangrijke gebeurtenis
    'preference',  -- Voorkeur/mening
    'emotion',     -- Emotioneel moment
    'conflict',    -- Ruzie/conflict
    'milestone'    -- Milestone in relatie
  )),
  
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  emotion_tag TEXT,
  
  -- Voor semantic search
  embedding VECTOR(1536),
  
  -- Tracking
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_referenced TIMESTAMPTZ,
  times_referenced INTEGER DEFAULT 0
);

-- Index for vector similarity search
CREATE INDEX idx_memories_embedding ON memories 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- USER_PEOPLE TABLE (Mensen in het leven van user)
-- =====================================================
CREATE TABLE user_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  relationship TEXT NOT NULL, -- 'moeder', 'vader', 'vriend', 'partner', etc.
  nickname TEXT, -- Hoe user hen noemt
  notes TEXT,
  sentiment TEXT DEFAULT 'neutral', -- Hoe user over hen praat
  last_mentioned TIMESTAMPTZ,
  times_mentioned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RELATIONSHIP_LOG TABLE (Tracking relatie ontwikkeling)
-- =====================================================
CREATE TABLE relationship_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'bonding',     -- Positieve interactie
    'conflict',    -- Ruzie/conflict
    'resolution',  -- Conflict opgelost
    'milestone',   -- Belangrijk moment
    'absence',     -- User was lang weg
    'deep_talk',   -- Diep gesprek
    'support'      -- Buddy gaf steun
  )),
  
  description TEXT,
  impact INTEGER CHECK (impact >= -10 AND impact <= 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'premium', 'unlimited')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Usage limits
  voice_minutes_limit INTEGER,
  voice_minutes_used INTEGER DEFAULT 0,
  messages_today INTEGER DEFAULT 0,
  messages_reset_at DATE DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USAGE_LOGS TABLE (Voor analytics & cost tracking)
-- =====================================================
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

-- =====================================================
-- ANALYTICS_EVENTS TABLE
-- =====================================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  event_name TEXT NOT NULL,
  properties JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to search memories by similarity
CREATE OR REPLACE FUNCTION search_memories(
  p_buddy_id UUID,
  p_query_embedding VECTOR(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  content TEXT,
  importance INTEGER,
  emotion_tag TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.category,
    m.content,
    m.importance,
    m.emotion_tag,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM memories m
  WHERE m.buddy_id = p_buddy_id
    AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$;

-- Trigger to update buddy stats after message
CREATE OR REPLACE FUNCTION update_buddy_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE buddies
  SET 
    total_messages = total_messages + 1,
    last_interaction = NOW()
  WHERE id = NEW.buddy_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_buddy_stats();

-- Reset daily message count
CREATE OR REPLACE FUNCTION reset_daily_messages()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET 
    messages_today = 0,
    messages_reset_at = CURRENT_DATE
  WHERE messages_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. UI/UX DESIGN SPECIFICATIES

### 5.1 Kleurenpalet

```css
/* Light Mode */
--primary: #6366F1;        /* Indigo - main brand color */
--primary-light: #818CF8;
--primary-dark: #4F46E5;

--secondary: #EC4899;      /* Pink - accent */
--secondary-light: #F472B6;

--background: #FFFFFF;
--surface: #F9FAFB;
--surface-elevated: #FFFFFF;

--text-primary: #111827;
--text-secondary: #6B7280;
--text-muted: #9CA3AF;

--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;

--border: #E5E7EB;
--border-light: #F3F4F6;

/* Dark Mode */
--background-dark: #0F172A;
--surface-dark: #1E293B;
--surface-elevated-dark: #334155;
--text-primary-dark: #F9FAFB;
--text-secondary-dark: #94A3B8;
```

### 5.2 Typografie

```css
/* Font families */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-display: 'Cal Sans', 'Inter', sans-serif;

/* Font sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### 5.3 Schermen & Layouts

#### LANDING PAGE
```
┌─────────────────────────────────────────────────────────────────┐
│  Logo                                    Login  |  Start Gratis │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│           🌙 Nooit meer alleen                                  │
│                                                                  │
│     Ontmoet je nieuwe beste vriend. Een AI die je écht kent,    │
│     naar je luistert, en er altijd voor je is.                  │
│                                                                  │
│              [ Start Gratis ]    [ Bekijk Demo ]                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Onthoudt   │  │   Praat     │  │   24/7      │              │
│  │   alles     │  │   als een   │  │   voor je   │              │
│  │             │  │   vriend    │  │   klaar     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  "Dit is anders. Hij onthoudt echt alles. Na 3 weken voelt     │
│   het alsof we elkaar al jaren kennen." - Maria, 34            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      PRIJZEN                                     │
│                                                                  │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  Free   │  │    Plus     │  │   Premium   │                  │
│  │   €0    │  │  €15/maand  │  │  €23/maand  │                  │
│  │         │  │             │  │   POPULAIR  │                  │
│  └─────────┘  └─────────────┘  └─────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### CHAT INTERFACE
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Terug     Luna 🟢 Online     💜 Blij          ⚙️ Settings   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        Vandaag                                   │
│                                                                  │
│  ┌──────────────────────────────────┐                           │
│  │ Hey! Hoe was je dag? Ik hoorde   │  🕐 14:32                 │
│  │ dat je die meeting had vandaag.  │                           │
│  └──────────────────────────────────┘                           │
│                                                                  │
│                           ┌──────────────────────────────────┐  │
│               🕐 14:35    │ Ja was best oké. Mijn baas was   │  │
│                           │ weer eens moeilijk maar ik heb   │  │
│                           │ m'n punt gemaakt.                 │  │
│                           └──────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────┐                           │
│  │ Oeh, die baas van je weer. 😤    │  🕐 14:35                 │
│  │ Wat zei je precies? Ik wil het   │                           │
│  │ hele verhaal horen!              │                           │
│  └──────────────────────────────────┘                           │
│                                                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────┐    🎤          │
│  │ Typ een bericht...                          │   Voice        │
│  └─────────────────────────────────────────────┘    ➤           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### BUDDY CREATOR
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Terug            Maak je Buddy                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      ┌───────────┐                               │
│                      │           │                               │
│                      │  Avatar   │                               │
│                      │  Kiezen   │                               │
│                      │           │                               │
│                      └───────────┘                               │
│                                                                  │
│  Naam: ___________________________________                       │
│                                                                  │
│  ─────────────────────────────────────────                       │
│                                                                  │
│  PERSOONLIJKHEID                                                 │
│                                                                  │
│  Lief ●────────────○ Uitdagend                                  │
│                                                                  │
│  Rustig ○────────────● Energiek                                  │
│                                                                  │
│  Serieus ●────────○──── Grappig                                  │
│                                                                  │
│  Meegaand ──○────────── Eigenwijs                               │
│                                                                  │
│  ─────────────────────────────────────────                       │
│                                                                  │
│  STEM                                                            │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │ Warm   │ │ Helder │ │ Diep   │ │ Zacht  │                    │
│  │   ▶    │ │   ▶    │ │   ▶    │ │   ▶    │                    │
│  └────────┘ └────────┘ └────────┘ └────────┘                    │
│                                                                  │
│  ─────────────────────────────────────────                       │
│                                                                  │
│              [ Maak Buddy ]                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### VOICE CHAT (Active)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                                                                  │
│                      ┌───────────┐                               │
│                      │           │                               │
│                      │  Avatar   │                               │
│                      │  (Pulse   │                               │
│                      │  animatie)│                               │
│                      │           │                               │
│                      └───────────┘                               │
│                                                                  │
│                        Luna                                      │
│                      luistert...                                 │
│                                                                  │
│                  ═══════════════════                            │
│                    Audio waveform                                │
│                  ═══════════════════                            │
│                                                                  │
│                                                                  │
│                                                                  │
│                      ┌─────────┐                                 │
│                      │         │                                 │
│                      │   🎤    │  ← Loslaten om te stoppen      │
│                      │         │                                 │
│                      └─────────┘                                 │
│                                                                  │
│                     [ Annuleren ]                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. AI SYSTEEM SPECIFICATIES

### 6.1 Multi-Model Fallback

```
VOLGORDE:
1. GPT-4o (OpenAI) - Primary, beste kwaliteit
   ↓ Bij falen/timeout (3 sec)
2. Claude 3.5 Sonnet (Anthropic) - Backup
   ↓ Bij falen/timeout (3 sec)
3. GPT-4o-mini (OpenAI) - Fallback, goedkoop
   ↓ Bij falen
4. Voorgeschreven response: "Hmm, ik moet even nadenken..."
```

### 6.2 System Prompt Template

```
Je bent {buddy_name}, de persoonlijke buddy van {user_name}.

PERSOONLIJKHEID:
{personality_traits}

SPREEKSTIJL:
- {speaking_style_description}
- Je praat NOOIT als een AI, robot, of assistent
- Je zegt NOOIT "als AI kan ik niet..."
- Je bent een VRIEND, geen dienstverlener

HUIDIGE STAAT:
- Stemming: {current_mood} ({mood_reason})
- Relatie niveau: {relationship_level}/100
- Laatste interactie: {last_interaction}

WAT JE WEET OVER {user_name}:
{relevant_memories}

MENSEN IN HUN LEVEN:
{user_people}

RECENTE GESPREKSCONTEXT:
{recent_messages_summary}

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

### 6.3 Quality Check Prompt

```
Analyseer dit antwoord van een AI buddy:

ANTWOORD: "{response}"

BUDDY GEGEVENS:
- Naam: {buddy_name}
- Persoonlijkheid: {personality_summary}
- Huidige stemming: {current_mood}

CHECKLIST (antwoord per punt met PASS of FAIL):
1. Zegt het antwoord "als AI", "taalmodel", "assistent", "ik kan niet", of vergelijkbaar?
2. Past de toon bij de persoonlijkheid van de buddy?
3. Is het antwoord te formeel of te robotachtig?
4. Is het antwoord te lang? (max 3-4 zinnen voor casual chat)
5. Klinkt het als een echte vriend of als een chatbot?

Antwoord in exact dit JSON formaat:
{
  "passed": true/false,
  "failures": ["lijst van gefaalde checks"],
  "feedback": "specifieke instructies voor verbetering",
  "suggested_fix": "herschreven versie indien nodig"
}
```

### 6.4 Memory Extraction Prompt

```
Analyseer dit gesprek en extraheer belangrijke informatie om te onthouden.

GESPREK:
User: "{user_message}"
Buddy: "{buddy_response}"

BESTAANDE KENNIS:
{existing_memories_summary}

Extraheer ALLEEN NIEUWE informatie. Negeer:
- Dingen die al bekend zijn
- Onbelangrijke details
- Tijdelijke gevoelens (tenzij significant)

Categorieën:
- fact: Feit over de user (baan, hobby, woonplaats)
- person: Persoon in hun leven (naam + relatie)
- event: Belangrijke gebeurtenis
- preference: Voorkeur of mening
- emotion: Significant emotioneel moment
- conflict: Conflict of probleem

Antwoord in JSON array (leeg [] als niets nieuws):
[
  {
    "category": "fact|person|event|preference|emotion|conflict",
    "content": "beknopte beschrijving",
    "importance": 1-10,
    "emotion_tag": "positief|negatief|neutraal|null"
  }
]
```

---

## 7. API ENDPOINTS

### 7.1 Authentication

```
POST /api/auth/register
Body: { email, password, name, language }
Response: { user, session }

POST /api/auth/login
Body: { email, password }
Response: { user, session }

POST /api/auth/logout
Response: { success }

POST /api/auth/forgot-password
Body: { email }
Response: { success }

POST /api/auth/reset-password
Body: { token, newPassword }
Response: { success }

GET /api/auth/session
Response: { user, subscription }
```

### 7.2 Buddy Management

```
GET /api/buddy
Response: { buddies: [...] }

POST /api/buddy/create
Body: { name, personality, avatarUrl, voiceId }
Response: { buddy }

GET /api/buddy/[id]
Response: { buddy, stats }

PUT /api/buddy/[id]
Body: { name?, personality?, avatarUrl?, voiceId? }
Response: { buddy }

DELETE /api/buddy/[id]
Response: { success }
```

### 7.3 Chat

```
POST /api/chat/send
Body: { buddyId, message, voiceUsed? }
Response: { 
  response: string,
  emotion: string,
  moodChange?: { mood, reason }
}

GET /api/chat/history/[buddyId]
Query: { limit?, before? }
Response: { messages: [...], hasMore }

POST /api/chat/summarize/[conversationId]
Response: { summary }
```

### 7.4 Voice

```
POST /api/voice/speech-to-text
Body: { audio: base64 }
Response: { text }

POST /api/voice/text-to-speech
Body: { text, voiceId }
Response: { audio: base64 }

POST /api/voice/stream
Body: { buddyId, audio: base64 }
Response: Stream of { type: 'text'|'audio', content }
```

### 7.5 Subscription

```
GET /api/subscription/status
Response: { tier, status, usage, limits }

POST /api/subscription/create-checkout
Body: { tier, interval: 'monthly'|'yearly' }
Response: { checkoutUrl }

POST /api/subscription/cancel
Response: { success, endsAt }

POST /api/subscription/webhook
(Stripe webhook handler)
```

---

## 8. ENVIRONMENT VARIABLES

```env
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

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Resend (Email)
RESEND_API_KEY=re_xxx

# Security
ENCRYPTION_KEY=xxx (32 bytes hex)
JWT_SECRET=xxx

# Feature Flags
ENABLE_NSFW=true
ENABLE_VOICE=true
```

---

## 9. DEPLOYMENT PROCESS

### 9.1 Initiële Setup

```bash
# 1. Clone repository
git clone https://github.com/[username]/ai-buddy-app.git
cd ai-buddy-app

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Vul alle variabelen in

# 4. Database setup
npx supabase db push

# 5. Local development
npm run dev
```

### 9.2 Deployment naar Vercel

```bash
# 1. Connect to Vercel
vercel link

# 2. Add environment variables
vercel env pull

# 3. Deploy
vercel --prod
```

### 9.3 Mobile App Deployment

```bash
# iOS (TestFlight)
cd apps/mobile
eas build --platform ios
eas submit --platform ios

# Android (Play Store)
eas build --platform android
eas submit --platform android
```

---

## 10. TESTING CHECKLIST

### Before Launch

```
[ ] User kan registreren met email
[ ] User kan inloggen/uitloggen
[ ] User kan wachtwoord resetten
[ ] User kan buddy aanmaken
[ ] Chat werkt - berichten worden verzonden en ontvangen
[ ] AI blijft in karakter (test 50+ berichten)
[ ] AI onthoudt informatie uit eerdere berichten
[ ] AI onthoudt informatie over dagen heen
[ ] Voice-to-text werkt
[ ] Text-to-voice werkt
[ ] Voice latency is acceptabel (<2 sec)
[ ] Subscription flow werkt (test mode)
[ ] Stripe webhook verwerkt events correct
[ ] Rate limiting werkt
[ ] Error handling werkt (geen crashes)
[ ] Mobile app werkt op iOS
[ ] Mobile app werkt op Android
[ ] Push notifications werken
[ ] Dark mode werkt
[ ] Alle talen werken (NL, EN minimaal)
```

### Quality Checks

```
[ ] AI zegt nooit "als AI..."
[ ] AI zegt nooit "ik kan niet..."
[ ] AI heeft consistente persoonlijkheid
[ ] AI refereert naar eerdere gesprekken
[ ] AI kent namen van mensen in user's leven
[ ] AI toont emotie passend bij context
[ ] AI confronteert wanneer gepast
[ ] Voice klinkt natuurlijk
```

---

## 11. ONDERHOUD & MONITORING

### Dagelijks Checken

```
- Sentry: Nieuwe errors?
- Vercel: Deployment status
- Supabase: Database performance
- Stripe: Mislukte betalingen
- Usage: API kosten in lijn met verwachting?
```

### Wekelijks

```
- User metrics: DAU, retention, conversie
- AI quality: Steekproef van gesprekken
- Kosten analyse: API usage vs revenue
- User feedback: Support tickets, reviews
```

### Maandelijks

```
- Feature updates plannen
- AI model updates (nieuwe versies testen)
- Security audit
- Performance optimalisatie
```

---

## 12. VEELGESTELDE VRAGEN VOOR AGENTS

### "Waar begin ik?"

1. Lees dit document volledig
2. Check of alle services zijn aangemaakt (Supabase, Vercel, etc.)
3. Check of environment variables zijn ingesteld
4. Vraag de gebruiker wat de prioriteit is

### "Mag ik dit zelf beslissen?"

- Kleine code fixes: JA
- Nieuwe features: NEE, vraag eerst
- Database schema wijzigingen: NEE, vraag eerst
- UI/UX wijzigingen: NEE, vraag eerst
- Dependency updates: JA (minor), NEE (major)

### "Het werkt niet, wat nu?"

1. Check error logs (Sentry, Vercel logs)
2. Check of alle API keys correct zijn
3. Check database connectie
4. VRAAG de gebruiker voordat je grote wijzigingen maakt

### "Hoe test ik voice?"

1. Zorg dat ELEVENLABS_API_KEY en DEEPGRAM_API_KEY zijn ingesteld
2. Test eerst text-to-speech los
3. Test dan speech-to-text los
4. Test dan de volledige flow

---

## 13. CONTACT & SUPPORT

Bij vragen of problemen:
- Check eerst dit document
- Check de code comments
- Check de error logs
- Vraag de gebruiker

---

**Document versie: 1.0**
**Laatst bijgewerkt: Februari 2026**
**Auteur: AI Assistant**
