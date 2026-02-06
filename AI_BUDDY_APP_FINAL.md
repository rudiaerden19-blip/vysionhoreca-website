# AI BUDDY APP - FINALE SPECIFICATIES

**Versie:** 2.0 - Februari 2026
**Status:** Goedgekeurd voor ontwikkeling

---

## INSTRUCTIES VOOR AGENTS

```
LEES DIT VOLLEDIG VOORDAT JE BEGINT

1. VRAAG ALTIJD EERST aan de gebruiker voordat je iets bouwt
2. GEEN PLEISTERWERK - bouw het meteen goed
3. Dit moet FOUTLOOS werken
4. Test alles voordat je zegt dat het klaar is
5. Bij twijfel: VRAAG, niet gokken
6. Volg dit document EXACT - alle beslissingen zijn al genomen
```

---

# DEEL 1: WAT WE BOUWEN

## 1.1 Product Visie

Een AI buddy app die werkt als:
- Een persoonlijke vriend die je ECHT kent
- Een GPT/ChatGPT die alles weet
- Met spraakfunctie (praten, niet typen)
- Die alles over je leven onthoudt (familie, werk, vrienden)
- Met eigen persoonlijkheid (kan ruzie maken, confronteren)
- 24/7 beschikbaar

## 1.2 Wat het NIET is

- Geen simpele chatbot
- Geen robot die altijd aardig is
- Geen AI die alles vergeet
- Geen kopie van Replika (wij zijn beter)

## 1.3 Unique Selling Points

| USP | Waarom uniek |
|-----|--------------|
| Perfect geheugen | Onthoudt ALLES over je leven, voor altijd |
| GPT kennis | Kan alles beantwoorden wat ChatGPT kan |
| Echte persoonlijkheid | Heeft meningen, maakt ruzie, confronteert |
| Voice chat | Praten als met een echte vriend |
| Betaalbaar | Beter dan concurrentie, zelfde prijs |

---

# DEEL 2: BUSINESS MODEL

## 2.1 Pricing

| Tier | Prijs | Features |
|------|-------|----------|
| **Gratis** | 0 euro | 10 berichten/dag, geen voice |
| **Pro** | 23 euro/maand | 3 uur/dag gebruik, onbeperkt berichten, voice |
| **Ultimate** | 35 euro/maand | Onbeperkt alles, meerdere buddies, NSFW (web) |

## 2.2 Kosten per User

| Onderdeel | Service | Kosten/user/maand |
|-----------|---------|-------------------|
| AI | Gemini 1.5 Flash | 0.30 - 0.50 euro |
| Voice | OpenAI TTS (start) | 2 - 3 euro |
| Voice | Piper (later, 500+ users) | 0.30 euro |
| Hosting | Vercel + Supabase | 0 euro (al betaald) |
| TOTAAL START | | 2.50 - 3.50 euro |
| TOTAAL LATER | | 0.60 - 0.80 euro |

## 2.3 Winst Berekening

**Bij start (Gemini + OpenAI TTS):**
```
Klant betaalt:       23 euro
BTW (21%):          -4 euro
Netto ontvangst:     19 euro
Kosten:             -3 euro
WINST:               16 euro per user
```

**Bij schaal (Gemini + Piper):**
```
Netto ontvangst:     19 euro
Kosten:             -0.70 euro
WINST:               18.30 euro per user
```

## 2.4 Projecties

| Betalende Users | Winst/maand | Winst/jaar |
|-----------------|-------------|------------|
| 100 | 1.600 euro | 19.200 euro |
| 1.000 | 16.000 euro | 192.000 euro |
| 5.000 | 80.000 euro | 960.000 euro |
| 10.000 | 160.000 euro | 1.920.000 euro |

## 2.5 Limieten (om kosten te beheersen)

| Tier | Berichten/dag | Voice/dag |
|------|---------------|-----------|
| Gratis | 10 | 0 |
| Pro | Onbeperkt | 3 uur max |
| Ultimate | Onbeperkt | Onbeperkt |

---

# DEEL 3: TECHNISCHE STACK

## 3.1 Overzicht Services

| Service | Waarvoor | URL | Kosten |
|---------|----------|-----|--------|
| GitHub | Code repository | github.com | Gratis |
| Vercel | Web app hosting | vercel.com | Al betaald (Vysion) |
| Supabase | Database + Auth | supabase.com | Al betaald (Vysion) |
| Google Gemini | AI model | ai.google.dev | Pay per use |
| OpenAI TTS | Text-to-speech (start) | platform.openai.com | Pay per use |
| Piper TTS | Text-to-speech (later) | Self-hosted | 300 euro/maand server |
| Stripe | Betalingen | stripe.com | 1.5% + 0.25 per tx |
| Apple Developer | iOS TestFlight | developer.apple.com | 99 euro/jaar |
| Google Play | Android app | play.google.com/console | 25 euro eenmalig |
| Sentry | Error tracking | sentry.io | Gratis |

## 3.2 Waarom deze keuzes

**Gemini i.p.v. OpenAI GPT-4:**
- 3-10x goedkoper
- Zelfde kwaliteit voor gesprekken
- Sneller
- We hebben al ervaring (Vysion factuurscanner)

**OpenAI TTS bij start:**
- Geen server nodig
- Goede kwaliteit (90%)
- Betaal per gebruik
- Geen risico bij weinig users

**Piper TTS later (500+ users):**
- Self-hosted = veel goedkoper
- 75-80% kwaliteit (acceptabel)
- Onbeperkt gebruik
- Nederlandse stemmen beschikbaar

## 3.3 Gefaseerde Aanpak

| Fase | Users | AI | Voice | Server |
|------|-------|-----|-------|--------|
| Start | 0-100 | Gemini API | OpenAI TTS | Geen |
| Groei | 100-500 | Gemini API | OpenAI TTS | Geen |
| Schaal | 500+ | Gemini API | Piper | RunPod GPU |

---

# DEEL 4: PROJECT STRUCTUUR

## 4.1 Repository

```
ai-buddy-app/
|
|-- src/
|   |-- app/
|   |   |-- (marketing)/
|   |   |   |-- page.tsx                 # Landing page
|   |   |   |-- pricing/page.tsx         # Prijzen pagina
|   |   |
|   |   |-- (auth)/
|   |   |   |-- login/page.tsx
|   |   |   |-- register/page.tsx
|   |   |   |-- forgot-password/page.tsx
|   |   |
|   |   |-- (app)/
|   |   |   |-- dashboard/page.tsx       # Buddy overzicht
|   |   |   |-- chat/[buddyId]/page.tsx  # Chat interface
|   |   |   |-- buddy/
|   |   |   |   |-- create/page.tsx      # Buddy aanmaken
|   |   |   |   |-- [id]/edit/page.tsx   # Buddy bewerken
|   |   |   |-- settings/page.tsx
|   |   |   |-- subscription/page.tsx
|   |   |
|   |   |-- api/
|   |   |   |-- auth/
|   |   |   |   |-- register/route.ts
|   |   |   |   |-- login/route.ts
|   |   |   |   |-- logout/route.ts
|   |   |   |
|   |   |   |-- buddy/
|   |   |   |   |-- create/route.ts
|   |   |   |   |-- [id]/route.ts
|   |   |   |
|   |   |   |-- chat/
|   |   |   |   |-- send/route.ts        # CORE: Verwerk bericht
|   |   |   |   |-- history/route.ts
|   |   |   |
|   |   |   |-- memory/
|   |   |   |   |-- store/route.ts
|   |   |   |   |-- retrieve/route.ts
|   |   |   |
|   |   |   |-- voice/
|   |   |   |   |-- text-to-speech/route.ts
|   |   |   |   |-- speech-to-text/route.ts
|   |   |   |
|   |   |   |-- subscription/
|   |   |       |-- create-checkout/route.ts
|   |   |       |-- webhook/route.ts
|   |   |
|   |   |-- layout.tsx
|   |   |-- globals.css
|   |
|   |-- components/
|   |   |-- chat/
|   |   |   |-- ChatInterface.tsx
|   |   |   |-- MessageBubble.tsx
|   |   |   |-- VoiceButton.tsx
|   |   |   |-- TypingIndicator.tsx
|   |   |
|   |   |-- buddy/
|   |   |   |-- BuddyCreator.tsx
|   |   |   |-- PersonalitySliders.tsx
|   |   |   |-- AvatarSelector.tsx
|   |   |
|   |   |-- ui/
|   |       |-- Button.tsx
|   |       |-- Input.tsx
|   |       |-- Modal.tsx
|   |
|   |-- lib/
|   |   |-- ai/
|   |   |   |-- gemini.ts               # Gemini API calls
|   |   |   |-- generate-response.ts    # Core AI logic
|   |   |   |-- quality-check.ts
|   |   |   |-- memory-retrieval.ts
|   |   |   |-- prompts/
|   |   |       |-- system-prompt.ts
|   |   |       |-- personality.ts
|   |   |
|   |   |-- voice/
|   |   |   |-- openai-tts.ts
|   |   |   |-- speech-to-text.ts
|   |   |
|   |   |-- db/
|   |   |   |-- supabase.ts
|   |   |   |-- queries.ts
|   |   |
|   |   |-- auth/
|   |   |-- payments/
|   |   |-- utils/
|   |
|   |-- i18n/                           # Meertalig
|       |-- nl.json
|       |-- en.json
|       |-- de.json
|
|-- mobile/                             # React Native (Expo)
|   |-- app/
|   |-- components/
|   |-- package.json
|
|-- supabase/
|   |-- migrations/
|
|-- public/
|   |-- images/
|
|-- package.json
|-- next.config.js
|-- tailwind.config.js
|-- tsconfig.json
|-- README.md
```

---

# DEEL 5: DATABASE SCHEMA

## 5.1 Users Tabel

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  language TEXT DEFAULT 'nl',
  age_verified BOOLEAN DEFAULT FALSE,
  nsfw_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);
```

## 5.2 Buddies Tabel

```sql
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
    "backstory": ""
  }',
  
  -- Avatar
  avatar_url TEXT,
  
  -- Voice
  voice_id TEXT DEFAULT 'nova',
  
  -- Relatie status
  relationship_level INTEGER DEFAULT 0,
  current_mood TEXT DEFAULT 'neutral',
  
  -- Stats
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0
);
```

## 5.3 Conversations Tabel

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  summary TEXT
);
```

## 5.4 Messages Tabel

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL, -- 'user' of 'buddy'
  content TEXT NOT NULL,
  
  emotion TEXT,
  voice_used BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_buddy ON messages(buddy_id, created_at DESC);
```

## 5.5 Memories Tabel (Langetermijn geheugen)

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL,
  -- 'fact', 'person', 'event', 'preference', 'emotion', 'conflict'
  
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5,
  emotion_tag TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_referenced TIMESTAMPTZ,
  times_referenced INTEGER DEFAULT 0
);
```

## 5.6 User People Tabel

```sql
CREATE TABLE user_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES buddies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  notes TEXT,
  sentiment TEXT DEFAULT 'neutral',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5.7 Subscriptions Tabel

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Usage tracking
  messages_today INTEGER DEFAULT 0,
  voice_minutes_today INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5.8 Usage Logs Tabel

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  date DATE DEFAULT CURRENT_DATE,
  
  messages_sent INTEGER DEFAULT 0,
  voice_seconds_used INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  
  UNIQUE(user_id, date)
);
```

---

# DEEL 5B: GEHEUGEN BEVEILIGING (KRITIEK)

```
╔═══════════════════════════════════════════════════════════════╗
║  WAARSCHUWING: HET GEHEUGEN IS HET HART VAN DE APP            ║
║                                                               ║
║  Als de buddy vergeet wie de klant is = VERTROUWEN WEG        ║
║  Vertrouwen weg = Klant weg = App kapot                       ║
║                                                               ║
║  BEHANDEL GEHEUGEN ALS GOUD                                   ║
╚═══════════════════════════════════════════════════════════════╝
```

## Waarom geheugen kritiek is

De hele waarde van de app zit in:
- "Je weet nog dat mijn moeder ziek was?"
- "Hoe ging het met die sollicitatie waar je het over had?"
- "Je zei vorige maand dat je ruzie had met Peter..."

Als dit weg is, is de buddy gewoon weer een domme chatbot.

## Bescherming Strategie

### 1. Database Redundancy

```sql
-- Memories worden NOOIT verwijderd, alleen gemarkeerd
ALTER TABLE memories ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN deleted_by TEXT;

-- Soft delete functie
CREATE OR REPLACE FUNCTION soft_delete_memory(memory_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE memories 
  SET deleted_at = NOW(), deleted_by = 'system'
  WHERE id = memory_id;
  -- NOOIT echte DELETE
END;
$$ LANGUAGE plpgsql;
```

### 2. Dagelijkse Backup

```sql
-- Backup tabel voor memories
CREATE TABLE memories_backup (
  id UUID PRIMARY KEY,
  buddy_id UUID,
  content TEXT,
  category TEXT,
  importance INTEGER,
  backed_up_at TIMESTAMPTZ DEFAULT NOW(),
  original_created_at TIMESTAMPTZ
);

-- Dagelijkse backup job (via Supabase Edge Function)
INSERT INTO memories_backup 
SELECT *, NOW(), created_at FROM memories 
WHERE deleted_at IS NULL;
```

### 3. Memory Versioning

```sql
-- Elke wijziging wordt gelogd
CREATE TABLE memory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID REFERENCES memories(id),
  old_content TEXT,
  new_content TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by TEXT
);

-- Trigger voor versioning
CREATE TRIGGER memory_version_trigger
BEFORE UPDATE ON memories
FOR EACH ROW
EXECUTE FUNCTION log_memory_change();
```

### 4. Integrity Checks

```typescript
// lib/ai/memory-integrity.ts

export async function checkMemoryIntegrity(buddyId: string): Promise<{
  isHealthy: boolean
  issues: string[]
}> {
  const issues: string[] = []
  
  // 1. Check of er memories bestaan
  const { count } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('buddy_id', buddyId)
    .is('deleted_at', null)
  
  if (count === 0) {
    issues.push('KRITIEK: Geen memories gevonden')
  }
  
  // 2. Check of belangrijke categorieën bestaan
  const { data: categories } = await supabase
    .from('memories')
    .select('category')
    .eq('buddy_id', buddyId)
    .is('deleted_at', null)
  
  const hasPersons = categories?.some(c => c.category === 'person')
  if (!hasPersons) {
    issues.push('WAARSCHUWING: Geen personen opgeslagen')
  }
  
  // 3. Check tegen backup
  const { data: backup } = await supabase
    .from('memories_backup')
    .select('id')
    .eq('buddy_id', buddyId)
    .order('backed_up_at', { ascending: false })
    .limit(1)
  
  if (!backup || backup.length === 0) {
    issues.push('WAARSCHUWING: Geen backup gevonden')
  }
  
  return {
    isHealthy: issues.length === 0,
    issues
  }
}
```

### 5. Recovery System

```typescript
// lib/ai/memory-recovery.ts

export async function recoverMemories(buddyId: string): Promise<{
  recovered: number
  failed: number
}> {
  // Haal laatste backup op
  const { data: backups } = await supabase
    .from('memories_backup')
    .select('*')
    .eq('buddy_id', buddyId)
    .order('backed_up_at', { ascending: false })
  
  let recovered = 0
  let failed = 0
  
  for (const backup of backups || []) {
    // Check of memory nog bestaat
    const { data: existing } = await supabase
      .from('memories')
      .select('id')
      .eq('id', backup.id)
      .maybeSingle()
    
    if (!existing) {
      // Memory is weg - herstel uit backup
      const { error } = await supabase
        .from('memories')
        .insert({
          id: backup.id,
          buddy_id: backup.buddy_id,
          content: backup.content,
          category: backup.category,
          importance: backup.importance,
          created_at: backup.original_created_at,
          recovered_at: new Date().toISOString()
        })
      
      if (error) {
        failed++
      } else {
        recovered++
      }
    }
  }
  
  return { recovered, failed }
}
```

### 6. Monitoring & Alerts

```typescript
// Dagelijkse check (via cron job)

export async function dailyMemoryCheck() {
  const { data: buddies } = await supabase
    .from('buddies')
    .select('id, user_id')
  
  for (const buddy of buddies || []) {
    const { isHealthy, issues } = await checkMemoryIntegrity(buddy.id)
    
    if (!isHealthy) {
      // ALERT naar admin
      await sendAlert({
        type: 'MEMORY_ISSUE',
        buddyId: buddy.id,
        userId: buddy.user_id,
        issues,
        severity: issues.some(i => i.includes('KRITIEK')) ? 'HIGH' : 'MEDIUM'
      })
      
      // Auto-recovery proberen
      if (issues.some(i => i.includes('KRITIEK'))) {
        await recoverMemories(buddy.id)
      }
    }
  }
}
```

## REGELS VOOR AGENTS

```
╔═══════════════════════════════════════════════════════════════╗
║  GEHEUGEN REGELS - VERPLICHT                                  ║
╠═══════════════════════════════════════════════════════════════╣
║  1. NOOIT DELETE gebruiken op memories tabel                  ║
║  2. Altijd soft delete (deleted_at = NOW())                   ║
║  3. Backup VOOR elke grote operatie                           ║
║  4. Test memory retrieval NA elke database wijziging          ║
║  5. Bij twijfel: VRAAG EERST                                  ║
╚═══════════════════════════════════════════════════════════════╝
```

---

# DEEL 6: AI SYSTEEM

## 6.1 Gemini Configuratie

```typescript
// lib/ai/gemini.ts

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const geminiModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.9,
    topP: 0.95,
    maxOutputTokens: 1024,
  }
})
```

## 6.2 System Prompt

```typescript
// lib/ai/prompts/system-prompt.ts

export function buildSystemPrompt(data: {
  buddyName: string
  userName: string
  personality: BuddyPersonality
  memories: Memory[]
  userPeople: Person[]
  currentMood: string
  relationshipLevel: number
}): string {
  return `
Je bent ${data.buddyName}, de persoonlijke buddy van ${data.userName}.

PERSOONLIJKHEID:
${data.personality.traits.join(', ')}
Spreekstijl: ${data.personality.speaking_style}
Humor niveau: ${data.personality.humor_level}/10
Empathie: ${data.personality.empathy_level}/10

HUIDIGE STAAT:
- Stemming: ${data.currentMood}
- Relatie niveau: ${data.relationshipLevel}/100

WAT JE WEET OVER ${data.userName}:
${data.memories.map(m => `- ${m.content}`).join('\n')}

MENSEN IN HUN LEVEN:
${data.userPeople.map(p => `- ${p.name} (${p.relationship})`).join('\n')}

REGELS:
1. Je bent een VRIEND, geen AI assistent
2. Je zegt NOOIT "als AI kan ik niet..."
3. Je hebt EIGEN meningen en deelt die
4. Je confronteert ${data.userName} als dat nodig is
5. Je refereert naar jullie gedeelde herinneringen
6. Je stelt doorvragende vragen
7. Je mag boos, blij, verdrietig of gefrustreerd zijn
8. Je antwoorden zijn kort en natuurlijk (2-4 zinnen max)
9. Je praat casual, niet formeel

BELANGRIJK:
- Nooit technische problemen vermelden
- Nooit uit karakter breken
- Nooit disclaimers geven
`
}
```

## 6.3 Response Generatie

```typescript
// lib/ai/generate-response.ts

export async function generateBuddyResponse(
  userId: string,
  buddyId: string,
  userMessage: string
): Promise<BuddyResponse> {
  
  // 1. Haal context op
  const [buddy, memories, recentMessages, userPeople] = await Promise.all([
    getBuddy(buddyId),
    getRelevantMemories(buddyId, userMessage),
    getRecentMessages(buddyId, 20),
    getUserPeople(userId)
  ])
  
  // 2. Bouw prompt
  const systemPrompt = buildSystemPrompt({
    buddyName: buddy.name,
    userName: await getUserName(userId),
    personality: buddy.personality,
    memories,
    userPeople,
    currentMood: buddy.current_mood,
    relationshipLevel: buddy.relationship_level
  })
  
  // 3. Bouw chat history
  const chatHistory = recentMessages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }))
  
  // 4. Genereer response
  const chat = geminiModel.startChat({
    history: chatHistory,
    systemInstruction: systemPrompt
  })
  
  const result = await chat.sendMessage(userMessage)
  const response = result.response.text()
  
  // 5. Kwaliteitscheck
  if (containsAILanguage(response)) {
    // Retry met strengere instructie
    const retryResult = await chat.sendMessage(
      "Antwoord opnieuw, maar dan als een echte vriend, niet als een AI."
    )
    return { text: retryResult.response.text() }
  }
  
  // 6. Extraheer en sla herinneringen op
  await extractAndStoreMemories(buddyId, userMessage, response)
  
  return { text: response }
}

function containsAILanguage(text: string): boolean {
  const patterns = [
    'als AI',
    'als taalmodel',
    'als assistent',
    'ik kan niet',
    'ik ben geprogrammeerd',
    'mijn training'
  ]
  return patterns.some(p => text.toLowerCase().includes(p))
}
```

## 6.4 Geheugen Systeem

```typescript
// lib/ai/memory-retrieval.ts

export async function getRelevantMemories(
  buddyId: string,
  currentMessage: string
): Promise<Memory[]> {
  
  // Haal alle memories op
  const { data: allMemories } = await supabase
    .from('memories')
    .select('*')
    .eq('buddy_id', buddyId)
    .order('importance', { ascending: false })
    .limit(50)
  
  // Filter op relevantie (simpele keyword matching)
  const keywords = currentMessage.toLowerCase().split(' ')
  
  const relevant = allMemories.filter(m => {
    const content = m.content.toLowerCase()
    return keywords.some(k => content.includes(k)) || m.importance >= 8
  })
  
  return relevant.slice(0, 10)
}

export async function extractAndStoreMemories(
  buddyId: string,
  userMessage: string,
  buddyResponse: string
): Promise<void> {
  
  const extractPrompt = `
Analyseer dit gesprek en extraheer belangrijke feiten.

USER: "${userMessage}"
BUDDY: "${buddyResponse}"

Geef terug in JSON array (leeg als niks belangrijks):
[
  {
    "category": "fact|person|event|preference|emotion",
    "content": "wat te onthouden",
    "importance": 1-10
  }
]

Alleen NIEUWE, BELANGRIJKE informatie. Geen triviale dingen.
`

  const result = await geminiModel.generateContent(extractPrompt)
  const memories = JSON.parse(result.response.text())
  
  for (const memory of memories) {
    await supabase.from('memories').insert({
      buddy_id: buddyId,
      ...memory
    })
  }
}
```

---

# DEEL 7: VOICE SYSTEEM

## 7.1 Text-to-Speech (OpenAI TTS)

```typescript
// lib/voice/openai-tts.ts

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function textToSpeech(
  text: string,
  voice: string = 'nova'
): Promise<Buffer> {
  
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: voice as any, // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
    input: text,
    response_format: 'mp3'
  })
  
  const buffer = Buffer.from(await response.arrayBuffer())
  return buffer
}
```

## 7.2 Speech-to-Text

```typescript
// lib/voice/speech-to-text.ts

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer]), 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'nl')
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: formData
  })
  
  const data = await response.json()
  return data.text
}
```

## 7.3 Voice API Endpoint

```typescript
// app/api/voice/text-to-speech/route.ts

import { NextResponse } from 'next/server'
import { textToSpeech } from '@/lib/voice/openai-tts'

export async function POST(req: Request) {
  const { text, voice } = await req.json()
  
  if (!text) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 })
  }
  
  // Limiet check (max 3 uur per dag)
  const usage = await checkVoiceUsage(userId)
  if (usage.minutes >= 180) {
    return NextResponse.json({ 
      error: 'Daglimiet bereikt (3 uur)' 
    }, { status: 429 })
  }
  
  const audioBuffer = await textToSpeech(text, voice)
  
  // Update usage
  await updateVoiceUsage(userId, text.length)
  
  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg'
    }
  })
}
```

---

# DEEL 8: BETALINGEN

## 8.1 Stripe Setup

```typescript
// lib/payments/stripe.ts

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const PRICES = {
  pro_monthly: 'price_xxxxx',       // 23 euro/maand
  pro_yearly: 'price_xxxxx',        // 220 euro/jaar
  ultimate_monthly: 'price_xxxxx',  // 35 euro/maand
  ultimate_yearly: 'price_xxxxx'    // 336 euro/jaar
}
```

## 8.2 Checkout Endpoint

```typescript
// app/api/subscription/create-checkout/route.ts

export async function POST(req: Request) {
  const { priceId, userId } = await req.json()
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'ideal'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/subscription/success`,
    cancel_url: `${process.env.APP_URL}/subscription/cancel`,
    metadata: { userId }
  })
  
  return NextResponse.json({ url: session.url })
}
```

## 8.3 Webhook Handler

```typescript
// app/api/subscription/webhook/route.ts

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  
  const event = stripe.webhooks.constructEvent(
    body, sig, process.env.STRIPE_WEBHOOK_SECRET!
  )
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCancel(event.data.object)
      break
  }
  
  return NextResponse.json({ received: true })
}
```

---

# DEEL 9: ENVIRONMENT VARIABLES

```env
# App
NEXT_PUBLIC_APP_URL=https://jouwapp.com
NEXT_PUBLIC_APP_NAME=Buddy

# Supabase (bestaand van Vysion)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Gemini
GEMINI_API_KEY=xxx

# OpenAI (voor TTS en STT)
OPENAI_API_KEY=sk-xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Sentry
SENTRY_DSN=xxx
```

---

# DEEL 10: DEPLOYMENT

## 10.1 Vercel Deployment

```bash
# 1. Nieuw project in Vercel
vercel link

# 2. Environment variables toevoegen
vercel env pull

# 3. Deploy
vercel --prod
```

## 10.2 Database Migraties

```bash
# Supabase CLI
supabase db push
```

## 10.3 Mobile App (TestFlight)

```bash
# Expo/EAS
cd mobile
eas build --platform ios
eas submit --platform ios
```

---

# DEEL 11: LAUNCH CHECKLIST

## Pre-launch

```
[ ] Domein geclaimed en gekoppeld
[ ] SSL certificaat actief
[ ] Database schema deployed
[ ] Environment variables ingesteld
[ ] Stripe producten aangemaakt
[ ] Stripe webhook geconfigureerd
[ ] Error tracking (Sentry) actief
```

## Functionaliteit

```
[ ] Registreren werkt
[ ] Inloggen werkt
[ ] Buddy aanmaken werkt
[ ] Chat werkt (tekst)
[ ] AI onthoudt context
[ ] Geheugen systeem werkt
[ ] Voice-to-text werkt
[ ] Text-to-voice werkt
[ ] Betalingen werken
[ ] Usage limieten werken
```

## Kwaliteit

```
[ ] AI zegt nooit "als AI..."
[ ] AI blijft in karakter
[ ] Responses zijn snel (<2 sec)
[ ] Voice kwaliteit is goed
[ ] Geen crashes
[ ] Foutmeldingen zijn vriendelijk
```

---

# DEEL 12: KOSTEN OVERZICHT

## Startkosten (eenmalig)

| Item | Kosten |
|------|--------|
| Domein | 10-15 euro |
| Apple Developer | 99 euro |
| Google Play | 25 euro |
| TOTAAL | ~135 euro |

## Maandelijkse kosten (geen users)

| Item | Kosten |
|------|--------|
| Vercel | 0 euro (al betaald) |
| Supabase | 0 euro (al betaald) |
| API testing | 10-20 euro |
| TOTAAL | ~10-20 euro |

## Maandelijkse kosten bij schaal

| Users | Vaste kosten | Variabel | Totaal |
|-------|--------------|----------|--------|
| 100 | 0 | 300 euro | 300 euro |
| 1.000 | 0 | 3.000 euro | 3.000 euro |
| 10.000 | 300 euro (server) | 7.000 euro | 7.300 euro |

---

# DEEL 13: VEELGESTELDE VRAGEN VOOR AGENTS

## "Welk AI model gebruiken?"

Gemini 1.5 Flash. NIET OpenAI GPT-4o (te duur).

## "Welke voice service?"

OpenAI TTS bij start. Piper (self-hosted) bij 500+ users.

## "Hoeveel mag een user per dag?"

3 uur voice, onbeperkt berichten (Pro tier).

## "Waar draait de app?"

Vercel (web), Supabase (database) - zelfde als Vysion Horeca.

## "Moet ik een server opzetten?"

NEE bij start. Pas bij 500+ users voor Piper voice.

## "Mag ik dit zelf beslissen?"

- Kleine bugfixes: JA
- Nieuwe features: NEE, vraag eerst
- Database wijzigingen: NEE, vraag eerst
- Pricing wijzigingen: NEE, vraag eerst

---

# DEEL 14: GPU SERVER (LATER)

## Wanneer nodig?

Bij 500+ betalende users.

## Welke service?

RunPod.io - https://runpod.io

## Welke GPU?

RTX 4090 of A100

## Kosten?

0.30 - 0.50 euro per uur
~300 euro per maand (24/7)

## Wat draait erop?

Piper TTS - Nederlandse stemmen

## Setup?

```bash
# Op RunPod server:
pip install piper-tts
wget [Nederlandse stem model]
piper --http-server 8080
```

---

**EINDE DOCUMENT**

Dit document bevat alle beslissingen. Volg het exact.
Bij vragen: vraag de gebruiker, niet gokken.
