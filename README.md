# Pizzoni

App privata per un gruppo chiuso: organizza serate pizza, vota le date, registra eventi, raccoglie recensioni e foto.

## Funzionalita

- Login con Google OAuth (invite-only)
- Inviti gestiti da admin dalla pagina profilo
- Classifica pizzerie per punteggio medio, con filtro citta
- Pizzerie: creazione, elenco, filtro visitate/da visitare, ricerca
  - Ricerca integrata Google Places con geolocalizzazione opzionale
  - Immagine custom caricabile manualmente; fallback automatico: Google → foto evento recente → placeholder
- Pianificazione evento (votazione-first):
  - Creazione votazione con sola pizzeria + nota; le date si propongono dopo, in modo collaborativo
  - Calendario disponibilita condiviso: ogni membro segna le proprie date libere (vista doppio mese su desktop, singolo su mobile); qualsiasi membro puo proporre una nuova data
  - Classifica "Date piu votate" con le prime 3 in evidenza e toggle per vederle tutte
  - Modifica pizzeria della votazione aperta (owner/admin), per correggere errori senza dover ricreare la poll
  - Aggiornamenti in tempo reale (Supabase Realtime): voti, nuove date, modifica pizzeria e finalizzazione/cancellazione si propagano subito a tutti i membri collegati
  - Riquadro "Non hanno ancora votato" per capire subito chi sollecitare
  - Finalizzazione da owner o admin: crea l'evento e pre-compila i partecipanti dai voti disponibili
  - Cancellazione votazione aperta (solo admin)
- Dettaglio evento con sezioni collassabili:
  - Impostazione orario prenotazione (owner/admin)
  - Cambio pizzeria associata (owner/admin)
  - Gestione partecipanti (admin puo aggiungere/rimuovere qualsiasi membro)
  - Recensioni per categoria (0-10, supporto mezzi punti)
  - Note evento multiutente (ogni autore gestisce le proprie)
  - Foto: upload da file o camera, tag unico "foto della serata"
- Export calendario `.ics` per ogni evento
- Anteprime OG dinamiche per la condivisione evento (WhatsApp, Telegram, etc.)
- Vercel Cron per prevenire la pausa automatica del DB Supabase piano free, protetto da `CRON_SECRET`
- Proxy server-side per gli avatar Google (`/api/avatar`), per evitare blocchi del browser sugli hotlink diretti
- Skeleton di caricamento su Classifica, Eventi, Pizzerie e dettaglio evento (`loading.tsx` per route, nessuna dipendenza esterna)
- Tema scuro automatico (`prefers-color-scheme`, nessun toggle manuale), CSS puro senza dipendenze aggiuntive

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Supabase (Auth + Postgres + RLS)
- Cloudinary (upload immagini)
- Google Places API (New)
- Tailwind CSS 4

## Setup locale

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Variabili d'ambiente

Crea `.env.local` a partire da `env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
GOOGLE_MAPS_API_KEY=
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` si trova in Supabase Dashboard → Project → Settings → API → "Project API keys" (sezione `service_role`). Usata solo server-side per generare le anteprime OG delle pagine evento.

`CRON_SECRET` (opzionale ma consigliata): protegge `/api/keepalive`. Se impostata, aggiungere lo stesso valore anche in Vercel (Settings → Environment Variables) — Vercel la invia automaticamente come header `Authorization: Bearer <valore>` quando chiama la route via cron.

### 3. Migrazioni database (Supabase Cloud, senza CLI)

I file SQL sono in `supabase/migrations/`. Eseguirli in ordine cronologico via SQL Editor di Supabase.

- **DB nuovo**: partire da `20260422190500_init.sql`.
- **DB esistente**: partire da `20260422191500_existing_db_security_sync.sql`.

Migrazioni rilevanti per il flusso attuale:

| File | Contenuto |
|---|---|
| `20260422194000_membership_and_invites.sql` | Membership e sistema inviti |
| `20260422213000_agenda_poll_first.sql` | Schema votazioni + RPC finalizzazione |
| `20260422221000_drop_legacy_planner_tables.sql` | Rimozione tabelle legacy |
| `20260422224000_visit_attendees_admin_management.sql` | Gestione partecipanti admin |
| `20260423182000_pizzerias_google_metadata.sql` | Metadati Google su pizzerie |
| `20260424102000_visits_scheduled_at_and_admin_update.sql` | Orario prenotazione evento |
| `20260424113000_pizza_of_night_single_tag.sql` | Tag unico "foto della serata" |
| `20260424130000_visit_notes_multi_user.sql` | Note evento multiutente |
| `20260424134500_reviews_allow_half_points.sql` | Supporto voti con .5 |
| `20260424141000_pizzerias_custom_image.sql` | Immagine custom pizzeria |
| `20260424144000_set_pizza_of_night_sync_pizzeria_cover.sql` | Sync copertina pizzeria |
| `20260424145000_set_pizza_of_night_event_only.sql` | Tag foto solo su eventi |
| `20260424150000_cleanup_deleted_photo_references.sql` | Pulizia riferimenti foto eliminati |
| `20260424151000_cleanup_updated_photo_references.sql` | Pulizia riferimenti foto aggiornati |
| `20260621000000_cancel_poll_admin_only.sql` | Policy delete poll: solo admin, solo aperte |
| `20260723130000_calendar_open_date_proposals.sql` | Permette a qualsiasi membro di proporre date sulla votazione aperta |
| `20260723140000_enable_realtime_planner_tables.sql` | Abilita Supabase Realtime sulle tabelle della votazione + pizzerias |

### 4. Supabase Auth

- Abilitare il provider Google nella dashboard Supabase.
- Site URL locale: `http://localhost:3000`
- Redirect URL locale: `http://localhost:3000/auth/callback`
- In produzione: aggiornare entrambi con il dominio Vercel.

### 5. Google Cloud (Places API)

- Abilitare **Places API (New)** nel progetto Google Cloud.
- Creare una API key e impostarla in `GOOGLE_MAPS_API_KEY`.
- Restrizioni consigliate: API restrictions → solo Places API (New).

### 6. Avvia il dev server

```bash
npm run dev
```

### 7. Verifica qualita

```bash
npm run lint          # ESLint
npm run check:routes  # guard path canonici (AST-based)
npm run build         # build produzione
```

Questi stessi comandi vengono eseguiti automaticamente dalla CI su ogni push (`.github/workflows/ci.yml`).

## Deploy (Vercel)

Push su GitHub → deploy automatico su Vercel.

Il file `vercel.json` configura un Cron Job che chiama `/api/keepalive` ogni 5 giorni per prevenire la pausa automatica del DB Supabase piano free. Il cron si attiva automaticamente al deploy.

Le variabili d'ambiente vanno configurate in Vercel dashboard (Settings → Environment Variables), inclusa `CRON_SECRET` (Vercel la invia automaticamente come header `Authorization` quando chiama la route via cron).

## Documentazione

- Guida funzionale: [`docs/guida-funzionale.md`](docs/guida-funzionale.md)
- Documentazione tecnica: [`docs/documentazione-tecnica.md`](docs/documentazione-tecnica.md)
- Prossimi sviluppi: [`docs/next-steps.md`](docs/next-steps.md)
