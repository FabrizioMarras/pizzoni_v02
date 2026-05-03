# Pizzoni 🍕

App privata per gruppo chiuso: classifica pizzerie, organizzazione eventi, recensioni e foto.

## Funzionalita principali

- Login con Google OAuth (invite-only)
- Gestione inviti admin
- Profilo utente (nome, avatar)
- Pizzerie: creazione, elenco, filtro visitate/non visitate
  - supporto immagine custom caricata manualmente
  - fallback automatico: Google -> foto evento recente -> custom -> placeholder
- Eventi:
  - votazione date per nuovo evento (votazione-first)
  - impostazione orario prenotazione evento (owner/admin)
  - finalizzazione evento con creazione automatica visita
  - distinzione upcoming/storico basata su data+ora evento
  - storico eventi + dettaglio evento
- Recensioni per evento con punteggio medio
- Foto evento:
  - scelta file o scatto camera direttamente nell'app
  - upload manuale con bottone `Aggiungi`
  - tag unico "foto della serata" per evento
- UI coerente con componenti condivisi:
  - `Button` unico con supporto icona sinistra/destra
  - `ButtonLink` unico per azioni di navigazione con stesso stile/API
  - `FileButton` unico per upload file con stile consistente
  - `Checkbox` brandizzato
  - `Avatar` unico con fallback automatico alle iniziali se URL non valido
  - toast globali per feedback utente
- Classifica pizzerie con filtro citta
- Ricerca pizzerie da Google Places API (New) con geolocalizzazione opzionale
- Export calendario `.ics` (`/api/calendar`)

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Supabase (Auth + Postgres + RLS)
- Cloudinary (upload immagini)
- Google Places API (New)

## Setup locale

### 1) Install

```bash
npm install
```

### 2) Variabili ambiente

Crea `.env.local` (vedi anche `env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `GOOGLE_MAPS_API_KEY`

### 3) Database migrations (Supabase Cloud, no CLI)

SQL in `supabase/migrations/`.

- DB nuovo: eseguire dalla prima migrazione in ordine cronologico.
- DB esistente: partire da `20260422191500_existing_db_security_sync.sql` e poi seguire ordine cronologico.

Migrazioni chiave del flusso attuale:
- `20260422194000_membership_and_invites.sql`
- `20260422213000_agenda_poll_first.sql`
- `20260422221000_drop_legacy_planner_tables.sql`
- `20260422224000_visit_attendees_admin_management.sql`
- `20260423182000_pizzerias_google_metadata.sql`
- `20260424102000_visits_scheduled_at_and_admin_update.sql`
- `20260424113000_pizza_of_night_single_tag.sql`
- `20260424130000_visit_notes_multi_user.sql`
- `20260424134500_reviews_allow_half_points.sql`
- `20260424141000_pizzerias_custom_image.sql`
- `20260424144000_set_pizza_of_night_sync_pizzeria_cover.sql`
- `20260424145000_set_pizza_of_night_event_only.sql`
- `20260424150000_cleanup_deleted_photo_references.sql`
- `20260424151000_cleanup_updated_photo_references.sql`

### 4) Configurazione Supabase Auth

- Provider Google abilitato in Supabase.
- Site URL locale: `http://localhost:3000`
- Redirect URL locale: `http://localhost:3000/auth/callback`

In produzione, aggiornare Site URL + Redirect URL con il dominio Vercel.

Alias storici route sono gestiti in `next.config.ts` tramite `redirects` (es. `/pizzerias` -> `/pizzerie`, `/login` -> `/accedi`).

Guard automatica path canonici:
- `npm run check:routes` esegue uno script AST-based che blocca riferimenti ai path legacy nel codice sorgente.

### 5) Configurazione Google Cloud (Places)

- Abilitare `Places API (New)` nello stesso progetto Google Cloud.
- Creare API key e impostarla in `GOOGLE_MAPS_API_KEY`.
- Restrizioni consigliate key:
  - API restrictions: solo `Places API (New)`.
  - Application restrictions: in base all'ambiente (dev/prod).

### 6) Run

```bash
npm run dev
```

### 7) Quality checks

```bash
npm run lint
npm run check:routes
npm run build
```

Smoke test e2e (Playwright):

```bash
npm run test:e2e
```

Note:
- il comando usa `npx playwright`; alla prima esecuzione potrebbe richiedere installazione runtime/browser.

## Documentazione

- Guida utente funzionale: `docs/guida-funzionale.md`
- Documentazione tecnica completa: `docs/documentazione-tecnica.md`
