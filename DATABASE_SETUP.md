# Database Setup Instructies

## Registratie Functionaliteit

Voor de registratie functionaliteit moet je de volgende migraties uitvoeren in Supabase:

### 1. Business Profiles Tabel

Voer dit uit in de Supabase SQL Editor:

```sql
-- Bestand: supabase/business_profiles_migration.sql
```

**Stap voor stap:**
1. Ga naar je Supabase project dashboard
2. Klik op "SQL Editor" in het menu
3. Open het bestand `supabase/business_profiles_migration.sql`
4. Kopieer de volledige inhoud
5. Plak het in de SQL Editor
6. Klik op "Run" om de migratie uit te voeren

### 2. Tenant Settings Tabel

Als deze nog niet bestaat, voer dan uit:

```sql
-- Bestand: supabase/admin_tables.sql
```

### 3. Subscriptions Tabel

Voor de trial functionaliteit:

```sql
-- Bestand: supabase/superadmin_migration.sql
```

## Controleren of migraties zijn uitgevoerd

Na het uitvoeren van de migraties, controleer of de tabellen bestaan:

1. Ga naar "Table Editor" in Supabase
2. Zoek naar de tabel `business_profiles`
3. Controleer of deze de volgende kolommen heeft:
   - `id` (UUID)
   - `name` (VARCHAR)
   - `email` (VARCHAR, UNIQUE)
   - `password_hash` (VARCHAR) ← **BELANGRIJK: Deze moet er zijn!**
   - `phone` (VARCHAR)
   - `is_active` (BOOLEAN)
   - `email_verified` (BOOLEAN)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)
   - `last_login` (TIMESTAMP)

## Foutmeldingen

Als je de fout ziet: "Could not find the 'password_hash' column"

Dit betekent dat:
- De tabel `business_profiles` bestaat maar de kolom `password_hash` ontbreekt
- OF de tabel bestaat helemaal niet

**Oplossing:**
Voer de migratie `business_profiles_migration.sql` opnieuw uit. Als de tabel al bestaat maar de kolom ontbreekt, voer dan dit uit:

```sql
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';
```

**Let op:** Als je `DEFAULT ''` gebruikt, moet je daarna alle bestaande records updaten met een geldige hash, of de DEFAULT verwijderen na het toevoegen van de kolom.
