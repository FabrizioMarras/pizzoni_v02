# Documentazione Tecnica Pizzoni

Versione documento: 2026-04-24  
Stack: Next.js 16 (App Router), React 19, TypeScript, Supabase, Tailwind CSS 4

## 1. Obiettivo applicazione

Pizzoni e una web app privata per un gruppo chiuso che organizza serate pizza, vota le date del prossimo evento, registra gli eventi passati e raccoglie recensioni/foto.

Punti chiave:
- accesso solo utenti invitati;
- login con Google OAuth;
- pianificazione evento con flusso votazione-first;
- leaderboard per citta;
- gestione pizzerie, eventi, recensioni, foto.

## 2. Architettura

### 2.1 Frontend
- Next.js App Router sotto `src/app`.
- UI in componenti client/server sotto `src/components`.
- Stili globali in `src/app/globals.css`.

### 2.2 Backend/BaaS
- Supabase Auth per autenticazione.
- Supabase Postgres per dati applicativi.
- RLS (Row Level Security) su tabelle pubbliche.
- Funzioni SQL custom per finalizzazione votazioni e gestione tag foto della serata.

### 2.3 API interne Next.js
- `POST /api/places/search`: ricerca pizzerie via Google Places API (New).
- `GET /api/calendar`: export ICS per calendario eventi.
- `GET /api/places/photo`: proxy immagini Google Places.

### 2.4 Data access layer (frontend)
Per ridurre coupling UI-query, parte delle operazioni client e stata estratta in layer dati:
- `src/lib/data/event-votes-client.ts` (snapshot, creazione votazione, voto disponibilita, finalizzazione).
- `src/lib/data/photos-client.ts` (CRUD foto evento e tag foto della serata).
- `src/lib/data/pizzeria-mapper.ts` (normalizzazione dati pizzerie + conteggio visitate con modalita `all/past`).
- `src/lib/data/pizzeria-queries.ts` (selector condivisi query pizzerie).
- `src/lib/data/visit-queries.ts` (selector condivisi query visite per card/eventi).
- `src/lib/cloudinary.ts` (upload immagine centralizzato).

## 3. Routing applicativo

Route principali:
- `/` classifica.
- `/accedi` login Google.
- `/eventi` gestione votazioni + storico eventi.
- `/eventi/[id]` dettaglio evento.
- `/pizzerie` gestione elenco pizzerie.
- `/profilo` profilo utente + inviti admin.
- `/guida` guida funzionale utenti.

Route alias/compatibilita:
- Alias storici centralizzati in `next.config.ts` (`redirects`):
  - `/agenda` -> `/eventi`
  - `/planner` -> `/eventi`
  - `/visits` -> `/eventi`
  - `/visits/:id` -> `/eventi/:id`
  - `/pizzerias` -> `/pizzerie`
  - `/login` -> `/accedi`
  - `/profile` -> `/profilo`

Route auth:
- `/auth/callback` finalizzazione sessione OAuth + enforcement invite-only.
- `/auth/auth-code-error` pagina errore autenticazione.

## 4. Autenticazione e autorizzazione

## 4.1 Provider e metodo login
- Login attivo: Google OAuth.
- Entry point UI: `src/components/Login.tsx`.

## 4.2 Callback e gate invite-only
File: `src/app/auth/callback/route.ts`.

Flusso:
1. Exchange `code` OAuth con sessione Supabase.
2. Lettura utente autenticato e email.
3. Verifica tabella `public.invites` su email.
4. Se email invitata:
   - `profiles.is_member = true`;
   - se `accepted_at` nullo su invite, viene valorizzato.
5. Se email non invitata:
   - fallback bootstrap primo utente: se nessun membro esiste, promuove primo utente a `is_member=true` + `is_admin=true` e crea invite auto-accettato;
   - altrimenti sign out e redirect a errore `not_invited`.

## 4.3 Ruoli
- `is_member`: abilita accesso funzionale all’app.
- `is_admin`: puo gestire inviti e operazioni admin su policy dedicate.

## 4.4 RLS
RLS attiva su tutte le tabelle applicative principali.  
Policy in migrazioni (`init`, `existing_db_security_sync`, `membership_and_invites`, `agenda_poll_first`, `visit_attendees_admin_management`).

## 5. Modello dati (stato corrente)

Tabelle principali in `public`:
- `profiles`: anagrafica membri estesa da `auth.users`.
- `invites`: whitelist email invitabili + stato accettazione.
- `pizzerias`: catalogo pizzerie.
- `visits`: evento concreto (data/locale) con `scheduled_at` per orario prenotazione.
- `visit_attendees`: partecipanti evento.
- `reviews`: recensioni per visita e utente (supporto voti a mezzi punti, es. `8.5`).
- `visit_notes`: note evento multiutente (autore per nota).
- `photos`: foto evento.
- `agenda_polls`: votazione aperta/chiusa per prossimo evento.
- `agenda_poll_date_options`: opzioni data per votazione.
- `agenda_poll_date_votes`: disponibilita utenti per opzione data.

Metadati Google su `pizzerias`:
- `google_place_id`
- `google_maps_uri`
- `google_photo_name`
- `latitude`
- `longitude`
- `custom_image_url` (copertina manuale opzionale caricata da utente)

Tabelle legacy rimosse:
- `upcoming_visits`, `rsvps`, `poll_suggestions`, `poll_votes` (drop tramite migrazione dedicata).

## 5.1 Relazioni chiave
- `pizzerias.id` -> `visits.pizzeria_id`.
- `visits.id` -> `reviews.visit_id`, `visit_notes.visit_id`, `photos.visit_id`, `visit_attendees.visit_id`.
- `profiles.id` -> campi `created_by`, `user_id`, `uploaded_by`, `owner_id`.
- `agenda_polls.id` -> `agenda_poll_date_options.poll_id`, `agenda_poll_date_votes.poll_id`.
- `agenda_poll_date_options.id` -> `agenda_poll_date_votes.date_option_id`.

## 5.2 Funzioni SQL
- `public.finalize_agenda_poll(p_poll_id uuid, p_option_id uuid) -> uuid`
  - valida permessi owner/admin;
  - crea pizzeria se mancante;
  - crea visita;
  - pre-popola partecipanti da voti `available`;
  - chiude votazione e aggancia `visit_id`.
- `public.set_pizza_of_night(p_visit_id uuid, p_photo_id uuid) -> void`
  - assegna in modo atomico il tag "foto della serata";
  - garantisce un solo tag per evento.

Note campo evento:
- `date`: data logica evento.
- `scheduled_at`: timestamp effettivo prenotazione; usato per transizione upcoming/concluso.

## 6. Flussi funzionali principali

## 6.1 Gestione pizzerie
Pagina: `/pizzerie` (`src/components/PizzeriaManager.tsx`).
- Creazione pizzeria via modal.
- Filtro elenco: tutte / visitate / da visitare.
- Badge visitata in base a presenza record in `visits`.
  - con fallback legacy: se manca `scheduled_at`, usa fine giornata della `date`.

### Ricerca Google Places integrata
- Digitazione nome (e opzionale citta) -> suggerimenti Google.
- Bottone geolocalizzazione -> bias dei risultati vicino all’utente.
- Selezione risultato -> auto-popolamento nome/indirizzo/citta.
- Per pizzerie manuali, e possibile caricare una copertina custom; se manca, il frontend usa placeholder automatico.

## 6.2 Nuovo evento (votazione-first)
Pagina: `/eventi` (`src/components/PlannerBoard.tsx`).
- Se non esiste votazione aperta, mostra azione `Aggiungi` in alto pagina.
- Il blocco `Prossimo Evento Pizzoni` in `/eventi` e lo stesso della home, senza CTA duplicata interna.
- Creazione nuova votazione:
  - scelta pizzeria esistente o nuova;
  - opzioni data multiple;
  - note opzionali.
- Voto disponibilita per ogni opzione data.
- Finalizzazione consentita a owner o admin.
- Finalizzazione crea evento in `visits`.

Vincolo logico UI:
- una sola votazione aperta alla volta.

## 6.3 Eventi e dettaglio
- Card prossimo evento (`NextEventCard`), inclusa in home e pagina eventi.
- In `/eventi`, fetch visite consolidato lato server nella pagina:
  - `NextEventCard` riceve `visit` opzionale pre-caricata;
  - `VisitsManager` riceve lista eventi conclusi gia filtrata;
  - riduzione query duplicate rispetto al caricamento separato componente-per-componente.
- Storico eventi in lista (solo eventi con orario passato).
- Dettaglio evento:
  - gestione orario prenotazione (owner/admin);
  - partecipanti;
  - recensioni;
  - note evento multiutente (CRUD per autore nota);
  - foto (selezione file/scatto camera, upload manuale, tag unico "foto della serata", sostituzione, eliminazione per autore foto);
  - link Google Maps.

Priorita immagini:
- Pizzeria: Google photo -> foto della serata piu recente della pizzeria -> custom_image_url -> placeholder.
- Evento: foto della serata (se presente) -> immagine pizzeria.

Transizione stato evento:
- `upcoming`: `scheduled_at` nel futuro;
- `concluso`: `scheduled_at <= now()`;
- fallback legacy senza `scheduled_at`: confronto su fine giornata della `date`.

## 6.4 Inviti admin
Pagina: `/profilo`.
- Admin inserisce email in `invites`.
- Solo email presenti in invite list possono completare login.

## 6.5 Design System UI
- `src/components/ui/Button.tsx`: componente bottone riusabile (`primary`, `secondary`, `unstyled`) usato in tutto il repo.
  - API icone: `icon`, `iconPosition` (`left`/`right`), `iconClassName`.
  - comportamento base centralizzato: `inline-flex`, allineamento contenuti, `cursor-pointer`, gestione `disabled`.
  - tutte le azioni principali del prodotto usano il componente con icona esplicita per coerenza visiva.
- `src/components/ui/Checkbox.tsx`: checkbox brandizzato riusabile.
- `src/components/ui/ButtonLink.tsx`: variante link del bottone con API coerente (`variant`, `icon`, `iconPosition`).
- `src/components/ui/FileButton.tsx`: bottone upload file riusabile con stile coerente (`btn-secondary`) e input hidden incapsulato.
- `src/components/ui/Avatar.tsx`: avatar unificato con fallback iniziali (URL non valido/non presente).
- `src/components/ui/ToastProvider.tsx`: sistema toast globale (success/warning/error/info).

## 6.6 Utility condivise
- `src/lib/visit-time.ts`: logica unica per timestamp e stato evento:
  - `getVisitTimestamp`
  - `isUpcomingVisit`
  - `isDoneVisit`
  - `getNowTimestamp`
- usata in classifica/home/eventi/storico per evitare divergenze di comportamento.
- `src/lib/supabase-relations.ts`: normalizzazione relazioni Supabase (`T | T[]`):
  - `firstOrNull`
  - `firstOrThrow`
- `src/lib/profile-flags.ts`: lettura centralizzata flag membership (`is_admin`, `is_member`) su profilo.

## 6.8 Guard routing canonico
- Script: `scripts/check-canonical-routes.mjs`.
- Controllo AST-based su `src` per individuare riferimenti ai path legacy in:
  - `href` JSX
  - `redirect(...)`/`permanentRedirect(...)`
  - `router.push(...)`/`router.replace(...)`
- Comando: `npm run check:routes`.

## 6.7 Convenzioni identita membro
- Rendering identita utente allineato su `name` + `avatar_url`.
- `pizza_emoji` mantenuto a livello DB legacy, ma non e piu una dipendenza del rendering principale.

## 7. API interne

## 7.1 `POST /api/places/search`
File: `src/app/api/places/search/route.ts`.

Input JSON:
- `query` (string, required)
- `latitude` (number, optional)
- `longitude` (number, optional)

Comportamento:
- chiama `https://places.googleapis.com/v1/places:searchText`;
- usa field mask minimale (`id`, `displayName`, `formattedAddress`, `addressComponents`);
- mappa risposta a `{ id, name, address, city }`.
- include anche metadati utili per persistenza pizzeria:
  - `latitude`, `longitude`, `mapsUri`, `photoName`.

Errori tipici:
- `Missing GOOGLE_MAPS_API_KEY` se env non valorizzata.

## 7.2 `GET /api/places/photo`
File: `src/app/api/places/photo/route.ts`.

Input query:
- `name` (required): valore `google_photo_name` ricevuto da Places.
- `w` (optional): larghezza max thumbnail.

Comportamento:
- proxy server-side verso Google Places Photo media endpoint;
- non espone la API key al client;
- ritorna stream immagine con cache header.

## 7.3 `GET /api/calendar`
- esporta evento in formato ICS.
- se `scheduled_at` esiste: crea evento con orario.
- se `scheduled_at` manca: crea evento all-day sulla sola data.

## 8. Configurazione ambiente

Variabili richieste:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

Variabile server richiesta per Places:
- `GOOGLE_MAPS_API_KEY`

## 8.1 Google Cloud (Places)
- API da abilitare: **Places API (New)**.
- Restrizioni consigliate API key:
  - API restrictions: solo Places API (New);
  - application restrictions in base a deployment.
- Billing GCP necessario (con quote gratuite per SKU, oltre soglia consumo a pagamento).

## 9. Migrazioni database

Cartella: `supabase/migrations`.

Ordine principale:
1. `20260422190500_init.sql` (solo DB nuovo)
2. `20260422191500_existing_db_security_sync.sql` (sync sicurezza/RLS su DB esistente)
3. `20260422194000_membership_and_invites.sql`
4. `20260422201500_magic_link_invite_gate.sql` (storica; oggi login principale e OAuth Google)
5. `20260422213000_agenda_poll_first.sql`
6. `20260422221000_drop_legacy_planner_tables.sql`
7. `20260422224000_visit_attendees_admin_management.sql`
8. `20260423182000_pizzerias_google_metadata.sql`
9. `20260424102000_visits_scheduled_at_and_admin_update.sql`
10. `20260424113000_pizza_of_night_single_tag.sql`
11. `20260424130000_visit_notes_multi_user.sql`
12. `20260424134500_reviews_allow_half_points.sql`
13. `20260424141000_pizzerias_custom_image.sql`
14. `20260424144000_set_pizza_of_night_sync_pizzeria_cover.sql`
15. `20260424145000_set_pizza_of_night_event_only.sql`
16. `20260424150000_cleanup_deleted_photo_references.sql`
17. `20260424151000_cleanup_updated_photo_references.sql`

Nota operativa Supabase Cloud:
- le migrazioni si applicano via SQL Editor in ordine cronologico.

## 10. Sicurezza

Pratiche applicate:
- invite-only a livello callback server;
- RLS su tabelle pubbliche;
- policy granulari per owner/admin/self;
- RPC di finalizzazione con controlli permessi.
- vincolo DB di unicita tag "foto della serata" per evento.

Attenzioni:
- non esporre `GOOGLE_MAPS_API_KEY` nel client; resta server-side.
- non committare `.env.local`.
- proteggere API key Google con restrizioni.
- usare upload preset Cloudinary corretto (case-sensitive).

## 11. Qualita e verifiche

Comandi:
- `npm run lint`
- `npm run check:routes`
- `npm run build`
- `npm run test:e2e` (smoke e2e con Playwright via `npx`)

Stato atteso:
- lint senza errori;
- guard route canoniche senza violazioni;
- build Next.js completa.

## 11.1 CI
- Workflow: `.github/workflows/ci.yml`
- Step automatici su push/PR:
  - `npm ci`
  - `npm run lint`
  - `npm run check:routes`
  - `npm run build`

## 12. Troubleshooting rapido

`Missing GOOGLE_MAPS_API_KEY`
- aggiungere key in `.env.local`;
- riavviare dev server.

`Errore auth not_invited`
- verificare email in `public.invites`;
- controllare `profiles.is_member`.

`relation already exists` su migrazione init
- usare migrazione sync per DB esistente invece di rieseguire init.

`Caricamento Cloudinary fallito (400)`
- verificare `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` e `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`;
- verificare che il preset esista e sia `unsigned`;
- attenzione: nome preset case-sensitive.

`Voti recensione con .5 falliscono`
- applicare migrazione `20260424134500_reviews_allow_half_points.sql`;
- verificare che `public.reviews` abbia colonne voto in `double precision`.

## 13. Convenzioni di sviluppo

- UI lingua italiana.
- Nomenclatura business: “evento”, “votazione”, non “poll” nei testi utente.
- Mobile-first su componenti interattivi (menu/modal full-screen mobile).
- Usare componenti UI condivisi (`Button`, `Checkbox`, `ToastProvider`) invece di elementi nativi non stilizzati.
- Tenere allineata questa documentazione quando cambia flusso o schema.
