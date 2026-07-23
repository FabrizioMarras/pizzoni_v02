# Documentazione Tecnica Pizzoni

Versione documento: 2026-07-24
Stack: Next.js 16 (App Router), React 19, TypeScript, Supabase, Tailwind CSS 4

---

## Indice

1. [Obiettivo applicazione](#1-obiettivo-applicazione)
2. [Architettura](#2-architettura)
3. [Routing applicativo](#3-routing-applicativo)
4. [Autenticazione e autorizzazione](#4-autenticazione-e-autorizzazione)
5. [Modello dati](#5-modello-dati)
6. [Flussi funzionali principali](#6-flussi-funzionali-principali)
7. [API interne](#7-api-interne)
8. [Configurazione ambiente](#8-configurazione-ambiente)
9. [Migrazioni database](#9-migrazioni-database)
10. [Sicurezza](#10-sicurezza)
11. [Qualita e verifiche](#11-qualita-e-verifiche)
12. [Troubleshooting rapido](#12-troubleshooting-rapido)
13. [Convenzioni di sviluppo](#13-convenzioni-di-sviluppo)

---

## 1. Obiettivo applicazione

Pizzoni e una web app privata per un gruppo chiuso che organizza serate pizza, vota le date del prossimo evento, registra gli eventi passati e raccoglie recensioni e foto.

Punti chiave:
- accesso solo utenti invitati;
- login con Google OAuth;
- pianificazione evento con flusso votazione-first;
- leaderboard pizzerie per citta;
- gestione pizzerie, eventi, recensioni, foto.

---

## 2. Architettura

### 2.1 Frontend
- Next.js App Router sotto `src/app`.
- UI in componenti client/server sotto `src/components`.
- Stili globali in `src/app/globals.css`.
- Skeleton di caricamento (`loading.tsx`) per le route con fetch server-side pesante: `/`, `/eventi`, `/eventi/[id]`, `/pizzerie`. Convenzione nativa Next.js: ogni file avvolge automaticamente la route in un Suspense boundary e viene mostrato finche il Server Component (e gli eventuali componenti async annidati, es. `Leaderboard`/`NextEventCard`) non risolve il fetch. Primitivo condiviso: `src/components/ui/Skeleton.tsx` (`animate-pulse` di Tailwind, nessuna dipendenza esterna).

### 2.2 Backend/BaaS
- Supabase Auth per autenticazione.
- Supabase Postgres per dati applicativi.
- RLS (Row Level Security) su tutte le tabelle pubbliche.
- Funzioni SQL custom per finalizzazione votazioni e gestione tag foto della serata.
- Supabase Realtime (`postgres_changes`) per aggiornamenti live della votazione aperta (vedi 6.2).

### 2.3 API interne Next.js
- `POST /api/places/search`: ricerca pizzerie via Google Places API (New).
- `GET /api/places/photo`: proxy server-side immagini Google Places.
- `GET /api/avatar`: proxy server-side avatar Google (evita il blocco ORB del browser su hotlink diretti).
- `GET /api/calendar`: export ICS per calendario eventi.
- `GET /api/keepalive`: ping DB Supabase per prevenire la pausa automatica del piano free (chiamato da Vercel Cron ogni 5 giorni).

### 2.4 Data access layer
Per ridurre coupling UI-query, le operazioni client sono estratte in moduli dedicati:
- `src/lib/data/event-votes-client.ts`: snapshot (inclusi tutti i membri `is_member = true`, tipo `PollMember`), creazione votazione, proposta data + voto disponibilita (`proposeDateAndVote`), rimozione voto (`removeDateVote`), modifica pizzeria votazione aperta (`updateEventVotePizzeria`), finalizzazione, cancellazione poll (admin).
- `src/lib/data/photos-client.ts`: CRUD foto evento e tag "foto della serata".
- `src/lib/data/pizzeria-mapper.ts`: normalizzazione dati pizzerie + conteggio visitate con modalita `all/past`.
- `src/lib/data/pizzeria-queries.ts`: selector condivisi per query pizzerie.
- `src/lib/data/visit-queries.ts`: selector condivisi per query visite (card/eventi).
- `src/lib/cloudinary.ts`: upload immagine centralizzato verso Cloudinary.
- `src/lib/pizzeria-image.ts`: logica priorita immagini pizzeria/evento (Google photo → foto serata → custom_image_url → placeholder deterministico).

### 2.5 Theming (dark mode)
Tutto il tema (chiaro/scuro) vive in `src/app/globals.css`, pilotato automaticamente da `@media (prefers-color-scheme: dark)` — nessun toggle manuale, nessuno stato persistito.

**Token base** (in `:root`, ridefiniti nel blocco dark): `--page-cream`, `--page-cream-strong`, `--ink`, `--ink-soft`, `--terracotta`, `--terracotta-deep`, `--olive`, `--olive-soft`, `--panel`, `--panel-border`, `--ring`, `--warning-deep`.

**Token RGB-triplet** (es. `--terracotta-rgb: 178, 74, 47;`) per ogni colore brand sopra, piu `--ink-rgb` e `--warning-rgb`. Permettono a qualunque tinta inline di seguire il tema: invece di un valore hardcoded come `rgba(178,74,47,0.12)`, i componenti usano `rgba(var(--terracotta-rgb),0.12)`, che cambia automaticamente quando la variabile viene ridefinita in dark mode.

**Token di superficie**, per il pattern ricorrente di "box interno chiaro" trovato in ~18 componenti:
- `--surface-soft` / `--surface-strong`: bianco traslucido (due livelli di opacita) per card annidate, chip, badge.
- `--surface-solid`: superficie neutra piena (sostituisce `bg-white` letterale) per righe di ricerca, celle calendario, checkbox.
- `--page-cream-rgb` / `--panel-rgb`: versioni RGB-triplet di `--page-cream`/`--panel`, per gli overlay full-screen (menu mobile, `Modal.tsx`) che necessitano un'alpha diversa da quella gia fissata nella variabile base.
- `--tag-featured-bg`: sfondo dedicato per il badge dorato "Foto della serata" (`PhotoGalleryManager.tsx`).
- `--toast-neutral-bg` / `--toast-success-bg` / `--toast-error-bg` / `--toast-warning-bg`: sfondi dedicati per `ToastProvider.tsx`, piu opachi dei token di superficie generici perche i toast devono restare leggibili come overlay sopra qualunque contenuto.
- `--scrim-rgb`: **fisso**, definito solo in `:root` e mai ridefinito nel blocco dark — per backdrop/ombre che devono restare scuri indipendentemente dal tema attivo (overlay dietro `Modal.tsx`, scrim della vista fotocamera in `PhotoGalleryManager.tsx`, ombra dei toast). A differenza degli altri token, ridefinirlo in dark mode sarebbe sbagliato: diventerebbe chiaro invece di restare uno scrim scuro.

**Convenzione per i componenti**: nessun colore hardcoded per superfici/tinte neutre — sempre `var(--token)` o `rgba(var(--x-rgb), alpha)`. Eccezioni intenzionali (lasciate letterali): testo bianco sopra un riempimento colorato pieno (bottoni, giorno selezionato nel calendario — leggibile in entrambi i temi senza bisogno di un token), lo sfondo nero del riquadro fotocamera in `PhotoGalleryManager.tsx` (viewfinder video, sempre nero come un lettore video), la grafica SVG autoconclusiva di `RankBadge.tsx` (rosetta/medaglia, come un'icona stampata), e `eventi/[id]/opengraph-image.tsx` (PNG statico per le anteprime social, deve restare identico indipendentemente dal tema del browser di chi guarda).

**Bug preesistente corretto nello stesso passaggio**: `--paper-border` era referenziata in 6 file (`Leaderboard.tsx`, `PhotoGalleryManager.tsx`, `PizzeriaManager.tsx`, `EventLocationManager.tsx`, `NextEventCard.tsx`, `VisitHistoryList.tsx`, `eventi/[id]/page.tsx`) ma non era mai definita in `globals.css` — i bordi corrispondenti venivano quindi resi con `currentColor` invece del marrone-panel previsto. Rinominata a `--panel-border`, l'unica variabile realmente esistente.

**Fix post-deploy (2026-07-24)**: lo sweep iniziale cercava solo le tuple rgba gia note (bianco/terracotta/oliva) invece di uno sweep libero su tutti i letterali, perdendo tre punti reali: il menu mobile di `Nav.tsx`, lo sfondo del componente condiviso `ui/Modal.tsx` (usato da ogni dialog dell'app — impatto piu ampio del solo menu) e il badge "Foto della serata". Da qui i token `--page-cream-rgb`/`--panel-rgb`/`--tag-featured-bg`/`--scrim-rgb` sopra. Lezione: per una sweep di "rimuovi tutti i colori hardcoded", cercare `rgba([0-9]` e `#[0-9a-fA-F]{3,6}` senza vincolare i pattern alle tuple gia individuate, non fidarsi solo dei grep mirati.

### 2.6 PWA / installabilita
App installabile su telefono ("Add to Home Screen"), senza dipendenze esterne (niente `next-pwa`).

**Manifest**: `src/app/manifest.ts`, convenzione nativa Next.js — default export tipizzato `MetadataRoute.Manifest`, servito automaticamente su `/manifest.webmanifest` con `<link rel="manifest">` gia iniettato nell'head, nessuna modifica manuale necessaria. Campi: `name`/`short_name` "Pizzoni", `display: 'standalone'`, `background_color`/`theme_color` allineati a `--page-cream`/`--terracotta` (valori chiari — il manifest non supporta `prefers-color-scheme`, a differenza del `viewport.themeColor`).

**Icone generate via codice** (nessun asset immagine nel repo — l'unico "logo" esistente era l'emoji 🍕 in `Nav.tsx`): tutte usano `ImageResponse` (`next/og`), stesso pattern gia in uso per `eventi/[id]/opengraph-image.tsx`. JSX condivisa in `src/lib/app-icon.tsx` (`renderAppIcon(fontSize)`: emoji 🍕 su gradiente `--terracotta` → `--terracotta-deep`), usata da 4 route:
- `src/app/icon.tsx` (32×32) e `src/app/apple-icon.tsx` (180×180): convenzione icone Next.js, generano i `<link rel="icon">`/`<link rel="apple-touch-icon">` automaticamente.
- `src/app/icon-192/route.ts` e `src/app/icon-512/route.ts`: Route Handler "semplici" (non convenzione icon/apple-icon), servono solo a dare al manifest URL statiche reali per `icons[]` (192×192, 512×512 — dimensioni richieste per l'installabilita su Android/iOS).

`ImageResponse` di default usa `emoji: 'twemoji'`: l'emoji viene renderizzata scaricando l'SVG da CDN twemoji, sia in dev sia in build — richiede quindi accesso di rete (presente su Vercel e in locale).

**Service worker**: `public/sw.js`, scritto a mano (nessuna convenzione Next.js per i service worker). Strategia deliberatamente minimale, coerente con un'app auth-gated su dati RLS:
- `install`: precache fissa di `/offline`, `/icon-192`, `/icon-512`.
- `activate`: elimina cache di versioni precedenti (`CACHE_NAME` con suffisso versione).
- `fetch`: richieste di navigazione → network-first, fallback alla pagina `/offline` cacheata se il fetch fallisce. Asset sotto `/_next/static/` → cache-first (sicuro, sono content-hashed/immutabili). Tutto il resto (API, dati Supabase, immagini) → passthrough diretto alla rete, **nessuna cache**: evita di servire dati stantii o di un altro utente per contenuti autenticati/RLS-protetti.

Registrazione: `src/components/ServiceWorkerRegister.tsx` (`'use client'`, `useEffect` con `navigator.serviceWorker.register('/sw.js')`, render `null`), montato una volta in `src/app/layout.tsx`.

**Pagina offline**: `src/app/offline/page.tsx`, statica, nessun fetch, riusa i token di tema esistenti (`page-wrap`/`surface-card`) — messaggio "Sei offline" + bottone "Riprova" (`location.reload()`).

**Theme color del browser**: `viewport` export in `src/app/layout.tsx` (API `Viewport`, distinta dall'oggetto `metadata`), con `themeColor` per media query chiaro/scuro (`--terracotta` light/dark), cosi la barra del browser/titlebar PWA segue il tema di sistema come il resto dell'app.

**Middleware**: vedi 4.5 — `/manifest.webmanifest`, `/icon`, `/apple-icon`, `/icon-192`, `/icon-512`, `/sw.js`, `/offline` sono esentati dal redirect di autenticazione, altrimenti un visitatore non loggato (fermo su `/accedi`) riceverebbe l'HTML di `/accedi` al posto del manifest/icone/service worker reali, rompendo l'installabilita pre-login.

---

## 3. Routing applicativo

Route principali:

| Path | Descrizione |
|---|---|
| `/` | Classifica pizzerie |
| `/accedi` | Login Google |
| `/eventi` | Votazioni + storico eventi |
| `/eventi/[id]` | Dettaglio evento |
| `/pizzerie` | Elenco e gestione pizzerie |
| `/profilo` | Profilo utente + inviti admin |
| `/guida` | Guida funzionale utenti |

Route auth:
- `/auth/callback`: finalizzazione sessione OAuth + enforcement invite-only.
- `/auth/auth-code-error`: pagina errore autenticazione.

Route alias/compatibilita (redirect permanenti in `next.config.ts`):
- `/agenda`, `/planner`, `/visits` → `/eventi`
- `/visits/:id` → `/eventi/:id`
- `/pizzerias` → `/pizzerie`
- `/login` → `/accedi`
- `/profile` → `/profilo`

---

## 4. Autenticazione e autorizzazione

### 4.1 Provider e metodo login
- Login attivo: Google OAuth.
- Entry point UI: `src/components/Login.tsx`.

### 4.2 Callback e gate invite-only
File: `src/app/auth/callback/route.ts`.

Flusso:
1. Exchange `code` OAuth con sessione Supabase.
2. Lettura utente autenticato e email.
3. Verifica presenza email in `public.invites`.
4. Se email invitata: imposta `profiles.is_member = true`; valorizza `accepted_at` se nullo.
5. Se email non invitata:
   - fallback bootstrap primo utente: se nessun membro esiste, promuove il primo utente a `is_member = true` + `is_admin = true` e crea un invite auto-accettato;
   - altrimenti: sign out e redirect a errore `not_invited`.

### 4.3 Ruoli
- `is_member`: abilita l'accesso funzionale all'app.
- `is_admin`: abilita operazioni privilegiate. Operazioni esclusive admin:
  - cancellazione votazioni aperte;
  - aggiunta/rimozione manuale partecipanti a un evento;
  - modifica orario prenotazione evento (condivisa con owner);
  - cambio pizzeria associata a un evento (condivisa con owner);
  - modifica pizzeria di una votazione aperta (condivisa con owner della votazione);
  - finalizzazione di qualsiasi votazione (non solo la propria);
  - gestione inviti (`/profilo`).

### 4.4 RLS
RLS attiva su tutte le tabelle applicative principali.
Policy principali distribuite nelle migrazioni: `init`, `existing_db_security_sync`, `membership_and_invites`, `agenda_poll_first`, `visit_attendees_admin_management`, `cancel_poll_admin_only`, `calendar_open_date_proposals`.

Policy notevole per cancellazione poll (`agenda_polls_delete_admin_only`, migrazione `20260621000000`): richiede `is_admin = true` e `status = 'open'`. Le poll chiuse non possono essere eliminate da nessuno.

Policy notevole per proposta date (`agenda_options_insert_participant`, migrazione `20260723130000`): sostituisce la vecchia policy owner/admin-only; qualsiasi utente autenticato puo inserire una riga in `agenda_poll_date_options`, purche la poll referenziata sia `status = 'open'`. La modifica/eliminazione di opzioni data resta owner/admin-only.

Modifica pizzeria votazione aperta: nessuna nuova policy necessaria; riutilizza `agenda_polls_update_owner_or_admin` (gia presente in `agenda_poll_first`), che permette update a owner della poll o admin.

### 4.5 Middleware (`src/proxy.ts`)
Applicato a tutte le route tranne asset statici (matcher esclude `_next/static`, `_next/image`, `favicon.ico`, immagini).

Bypass espliciti (nessun redirect a `/accedi`, in quest'ordine):
1. Route `*/opengraph-image` (necessario per le anteprime social).
2. User-agent noto di crawler social (WhatsApp, Telegram, facebookexternalhit, Twitterbot, Slackbot, LinkedInBot, Discordbot).
3. `/api/keepalive` (chiamato da Vercel Cron, mai da una sessione browser autenticata; protetto invece dal controllo `CRON_SECRET` nella route stessa — vedi 7.5).
4. Asset PWA (`/manifest.webmanifest`, `/icon`, `/apple-icon`, `/icon-192`, `/icon-512`, `/sw.js`, `/offline`) — nessun dato utente, devono restare raggiungibili anche da un visitatore non loggato perche l'installabilita/service worker funzionino prima del login (vedi 2.6).

Per ogni altra richiesta: legge la sessione Supabase dai cookie; se assente e la route non e `/auth/*`/`/accedi`, redirect a `/accedi`. Se l'utente e autenticato ma non e membro (`profiles.is_member = false`), redirect a `/auth/auth-code-error?error_code=not_invited`.

---

## 5. Modello dati

Tabelle principali in `public`:

| Tabella | Descrizione |
|---|---|
| `profiles` | Anagrafica membri, estende `auth.users` |
| `invites` | Whitelist email invitabili + stato accettazione |
| `pizzerias` | Catalogo pizzerie |
| `visits` | Evento concreto (data/locale) con `scheduled_at` per orario prenotazione |
| `visit_attendees` | Partecipanti per evento |
| `reviews` | Recensioni per visita e utente (supporto mezzi punti, es. `8.5`) |
| `visit_notes` | Note evento multiutente (una nota per autore) |
| `photos` | Foto evento |
| `agenda_polls` | Votazione aperta/chiusa per il prossimo evento |
| `agenda_poll_date_options` | Date proposte per una votazione; qualsiasi membro puo aggiungerne (non solo l'owner) |
| `agenda_poll_date_votes` | Disponibilita utenti per data proposta. Solo `available` viene scritto dal calendario (voto opt-in); il valore `not_available` resta nello schema per compatibilita storica ma non e piu usato dalla UI |

Metadati Google su `pizzerias`:
- `google_place_id`, `google_maps_uri`, `google_photo_name`, `latitude`, `longitude`
- `custom_image_url`: copertina manuale opzionale caricata dall'utente

Tabelle legacy rimosse:
- `upcoming_visits`, `rsvps`, `poll_suggestions`, `poll_votes` (drop tramite migrazione dedicata).

### 5.1 Relazioni chiave
- `pizzerias.id` → `visits.pizzeria_id`
- `visits.id` → `reviews.visit_id`, `visit_notes.visit_id`, `photos.visit_id`, `visit_attendees.visit_id`
- `profiles.id` → campi `created_by`, `user_id`, `uploaded_by`, `owner_id`
- `agenda_polls.id` → `agenda_poll_date_options.poll_id`, `agenda_poll_date_votes.poll_id`
- `agenda_poll_date_options.id` → `agenda_poll_date_votes.date_option_id`

### 5.2 Funzioni SQL
- `public.finalize_agenda_poll(p_poll_id uuid, p_option_id uuid) → uuid`
  - valida permessi owner/admin;
  - trova o crea la pizzeria;
  - crea la visita con la data scelta;
  - pre-popola i partecipanti dai voti `available`;
  - chiude la votazione e aggancia `visit_id`.
- `public.set_pizza_of_night(p_visit_id uuid, p_photo_id uuid) → void`
  - assegna in modo atomico il tag "foto della serata";
  - garantisce un solo tag attivo per evento.

Note sui campi dell'evento:
- `date`: data logica evento.
- `scheduled_at`: timestamp effettivo prenotazione; determina la transizione upcoming/concluso.

---

## 6. Flussi funzionali principali

### 6.1 Gestione pizzerie
Pagina: `/pizzerie` — componente: `src/components/PizzeriaManager.tsx`.

- Creazione pizzeria via modal.
- La creazione blocca duplicati confrontando nome + citta normalizzati con l'elenco gia caricato; in caso di match mostra toast warning e non esegue insert.
- Filtro elenco: tutte / visitate / da visitare.
- Ricerca client-side su nome, citta e indirizzo tramite `SearchBar`.
- Paginazione incrementale client-side: prima batch da 9 card, poi ulteriori batch da 9 al trigger di scroll.
- Badge "visitata" in base a presenza record in `visits` (con fallback legacy su fine giornata della `date` se manca `scheduled_at`).

**Ricerca Google Places integrata:**
- Digitazione nome (e opzionale citta) → suggerimenti Google in tempo reale.
- Bottone geolocalizzazione → bias dei risultati vicino all'utente.
- Selezione risultato → auto-popolamento nome/indirizzo/citta/metadati Google.
- Per pizzerie manuali (senza Google), e possibile caricare una copertina custom.

### 6.2 Nuovo evento (votazione-first)
Pagina: `/eventi` — componenti: `src/components/PlannerBoard.tsx` (form creazione, header votazione, finalizzazione) e `src/components/AvailabilityCalendar.tsx` (calendario disponibilita).

- Se non esiste votazione aperta, mostra il bottone `Aggiungi`.
- Creazione nuova votazione: scelta pizzeria (esistente o nuova) + nota opzionale. Nessuna data si sceglie in fase di creazione (`createEventVote` in `event-votes-client.ts` inserisce solo la riga `agenda_polls`).
- Il form di creazione e il form di modifica pizzeria condividono lo stesso modal/stato in `PlannerBoard.tsx`, distinti da un flag `isEditingPizzeria`; la risoluzione pizzeria (esistente/nuova) e centralizzata in `resolveEnsuredPizzeria()`.

**Calendario disponibilita (`AvailabilityCalendar.tsx`):**
- Componente client puro (nessuna libreria di date esterna; calcolo griglia mese con `Date` nativo).
- Layout responsive: due mesi affiancati da `md:` in su (mese corrente + successivo, ciascuno in una propria card `surface-card`), un solo mese su mobile. Header di navigazione condiviso: il pulsante "avanti" reale si sposta dal mese1 (mobile) al mese2 (desktop) via classi responsive (`md:invisible`), mantenendo simmetria nei due header.
- Tap su un giorno: se l'utente non ha gia un voto su quella data, chiama `proposeDateAndVote` (crea la riga `agenda_poll_date_options` se non esiste ancora, poi upsert su `agenda_poll_date_votes` con `availability: 'available'`); se lo ha gia, chiama `removeDateVote` (delete del voto). Non esiste scrittura di `not_available`.
- Ogni cella giorno mostra: evidenziazione se selezionata dall'utente corrente (bg olive), badge conteggio voti (bg terracotta, per contrasto sempre leggibile), anello per il giorno odierno, tinta terracotta per i weekend.
- Sotto il calendario: lista `rankedDates` (date con almeno un voto, ordinate per numero di voti decrescente), limitata a `TOP_DATES_COLLAPSED_COUNT` (3) con toggle "Mostra tutte/Mostra meno" (stato locale `showAllDates`).
- Finalizzazione (bottone "Conferma data evento" su ciascuna riga della lista, visibile solo a owner/admin) invoca lo stesso RPC `finalize_agenda_poll` di prima, invariato.

**Modifica pizzeria votazione aperta (owner/admin):**
- Bottone `Modifica pizzeria` nell'header della sezione "Votazione Aperta", accanto a `Cancella votazione`.
- Apre lo stesso modal di creazione, precompilato con i dati correnti della poll (`openEditPizzeriaModal()` in `PlannerBoard.tsx`); se i valori corrispondono a una pizzeria gia presente in catalogo, la ricollega automaticamente per riusare i metadati Google.
- Al salvataggio chiama `updateEventVotePizzeria(supabase, pollId, { pizzeria_name, location, city, notes })`, che fa update diretto su `agenda_polls`. Nessuna nuova RLS: riusa `agenda_polls_update_owner_or_admin`.

Vincolo UI: il form di creazione e nascosto se esiste gia una votazione aperta (`if (openEventVote) return` in `submitPizzeriaForm`). Non c'e un blocco tecnico a livello DB.

**Cancellazione votazione (admin only):**
- Bottone `Cancella votazione` nell'header della sezione "Votazione Aperta", visibile solo se `is_admin = true`.
- Richiede conferma tramite modal con nome pizzeria.
- Elimina in cascata: `agenda_polls` + `agenda_poll_date_options` + `agenda_poll_date_votes`.
- Bloccata dal DB se la poll ha `status = 'closed'` (RLS `agenda_polls_delete_admin_only`).
- Funzione: `cancelAgendaPoll(supabase, pollId)` in `src/lib/data/event-votes-client.ts`.

**Aggiornamenti real-time:**
- `PlannerBoard.tsx` apre un canale `supabase.channel('planner-realtime')` in un `useEffect` mount-only, sottoscritto a `postgres_changes` (`event: '*'`) su `agenda_polls`, `agenda_poll_date_options`, `agenda_poll_date_votes`, e (`event: 'INSERT'`) su `pizzerias`.
- Ogni evento ricevuto schedula un refetch **debounced** (~300ms, `window.setTimeout`) dell'intero snapshot tramite `loadData()` (wrappato in `useCallback`) invece di applicare patch granulari allo stato: i payload `postgres_changes` contengono solo le colonne raw della tabella, non la relazione `voter:profiles(...)` gia usata da `fetchPlannerData`, quindi un secondo fetch sarebbe comunque necessario per i dati del votante.
- Il debounce assorbe raffiche di eventi correlati (es. `proposeDateAndVote` scrive sia `agenda_poll_date_options` che `agenda_poll_date_votes`) in un unico refetch.
- Cleanup: al dismount viene cancellato l'eventuale timeout pendente e chiamato `supabase.removeChannel(channel)`.
- Prerequisito DB: le tabelle devono essere aggiunte alla publication `supabase_realtime` (migrazione `20260723140000_enable_realtime_planner_tables.sql`); senza questo passaggio manuale in SQL Editor, la sottoscrizione si apre ma non riceve eventi. Le policy RLS `select` esistenti (`auth.role() = 'authenticated'`) coprono gia il controllo permessi di Realtime, nessuna nuova policy necessaria.
- Le chiamate manuali `void loadData()` dopo ogni mutazione locale restano invariate: sono ridondanti con la sottoscrizione (il debounce assorbe il doppione) ma fungono da rete di sicurezza se il socket realtime è temporaneamente disconnesso.

**Chi non ha ancora votato:**
- `fetchPlannerData` include ora una quarta query (`profiles` con `is_member = true`), esposta come `members: PollMember[]` in `PlannerSnapshot`; nessuna nuova RLS necessaria (`profiles_select_authenticated`/`profiles_select_all_members` gia permettono la lettura a qualsiasi utente autenticato).
- In `PlannerBoard.tsx`, `votedUserIds` = insieme degli `user_id` con voto `available` su un'opzione data appartenente alla poll aperta; `nonVoters` = `members` che non compaiono in quell'insieme.
- Renderizzato come riquadro tinta terracotta "Non hanno ancora votato" sopra il calendario, con un tile per membro (`Avatar` + nome — non `MemberIdentity`, per evitare l'emoji pizza sull'avatar); se tutti hanno votato mostra invece una riga tinta oliva "Tutti hanno votato! 🎉".
- Si aggiorna automaticamente in tempo reale, perche `members` viene ripopolato dentro lo stesso `loadData()` gia richiamato dalla sottoscrizione realtime sopra.

### 6.3 Dettaglio evento
Pagina: `/eventi/[id]` — componente principale: `src/app/eventi/[id]/page.tsx`.

- Sezioni collassabili (`CollapsiblePanel`): Orario Evento, Partecipazione, Recensione, Note, Foto, Tutte le Recensioni.
- Gestione orario prenotazione (owner/admin) tramite `EventScheduleManager`.
- Cambio pizzeria associata all'evento (owner/admin) tramite `EventLocationManager`.
- Partecipanti: ogni membro puo aggiungersi/rimuoversi; admin puo aggiungere/rimuovere qualsiasi membro (`AttendeesManager`).
- Recensioni per categoria (0-10, mezzi punti supportati) tramite `ReviewForm`.
- Note evento multiutente: CRUD per autore nota tramite `EventNotesManager`.
- Foto: upload da file/camera, tag unico "foto della serata", eliminazione da parte dell'autore (`PhotoGalleryManager`).

Priorita immagini:
- Pizzeria: Google photo → foto della serata piu recente della pizzeria → custom_image_url → placeholder.
- Evento: foto della serata (se presente) → logica immagine pizzeria.

Transizione stato evento:
- `upcoming`: `scheduled_at` nel futuro.
- `concluso`: `scheduled_at <= now()`.
- Fallback legacy senza `scheduled_at`: confronto su fine giornata della `date`.

### 6.4 Inviti admin
Pagina: `/profilo` — componente: `src/components/InviteManager.tsx`.

- Admin inserisce email in `public.invites`.
- Solo le email presenti nell'invite list possono completare il login Google.
- Elenco inviti con stato (in attesa / accettato) e timestamp accettazione.

### 6.5 Design System UI

Tutti i componenti sono in `src/components/ui/`.

| Componente | Descrizione |
|---|---|
| `Button.tsx` | Bottone riusabile (`primary`, `secondary`, `unstyled`). Il prop `icon` e **obbligatorio**. API: `icon`, `iconPosition` (`left`/`right`), `iconClassName`. |
| `ButtonLink.tsx` | Variante link del bottone con API identica. |
| `FileButton.tsx` | Bottone upload file con input hidden incapsulato. |
| `Checkbox.tsx` | Checkbox brandizzato. |
| `Avatar.tsx` | Avatar con fallback automatico alle iniziali se URL non valido. |
| `MemberIdentity.tsx` | Identita membro composita: avatar + overlay emoji + nome. Props: `name`, `email`, `emoji`, `avatarUrl`, `size` (`sm`/`md`). |
| `Modal.tsx` | Dialog a portale (`createPortal`): overlay, blocco scroll body, chiusura su `Escape` e click fuori. Full-screen mobile, max 760px desktop. Props: `open`, `onClose`, `title`, `children`. |
| `CollapsiblePanel.tsx` | Sezione espandibile/collassabile con animazione CSS `grid-template-rows`. Props: `title`, `children`, `defaultOpen` (default `false`). |
| `RankBadge.tsx` | Badge SVG rosetta + nastro per classifica. Palette: oro (1), argento (2), bronzo (3), blu (4+). Props: `rank`, `size` (default 38px). |
| `ToastProvider.tsx` | Sistema toast globale (success / warning / error / info). |
| `SearchBar.tsx` | Barra ricerca controllata con label, placeholder, conteggio risultati e azione clear. Gestisce solo UI/input; la logica di matching resta nel componente padre. |
| `ScrollPagination.tsx` | Trigger scroll per paginazione incrementale. Non carica al mount; aggiunge batch solo su evento `scroll` con sentinel vicino al viewport. |
| `Skeleton.tsx` | Blocco placeholder `animate-pulse` riusato da tutti i `loading.tsx`. Props: `className` (dimensioni/forma a discrezione del chiamante). |

### 6.6 Utility condivise

- `src/lib/visit-time.ts`: logica centralizzata per timestamp e stato evento.
  - `getVisitTimestamp`, `isUpcomingVisit`, `isDoneVisit`, `getNowTimestamp`.
  - Usata in classifica, home, eventi e storico per evitare divergenze.
- `src/lib/supabase-relations.ts`: normalizzazione relazioni Supabase (`T | T[]`).
  - `firstOrNull`, `firstOrThrow`.
- `src/lib/profile-flags.ts`: lettura centralizzata flag membership (`is_admin`, `is_member`) da `profiles`.
- `src/lib/pizzeria-image.ts`: logica priorita immagini.
  - `getPizzeriaImageSrc`: Google photo → foto serata → custom_image_url → placeholder deterministico.
  - `getEventImageSrc`: foto della serata → fallback su `getPizzeriaImageSrc`.
  - `getPizzeriaPlaceholder`: uno dei 4 SVG in `/public/placeholders/` scelto tramite hash del seed (id+name+city).
- `src/lib/date-format.ts`: formattazione date con timezone `Europe/Amsterdam`.
  - `formatDateLabel(value)`: output `dd/mm/yyyy`.
  - `formatDateTimeLabel(value)`: output `dd/mm/yyyy, HH:MM`.
  - `formatIsoDateToItalian(value)`: converte `YYYY-MM-DD` → `dd/mm/yyyy` senza timezone.
  - `parseItalianDateToIso(value)`: converte `dd/mm/yyyy` o `dd-mm-yyyy` → `YYYY-MM-DD`; ritorna `null` se non valido.
  - `parseTimeToIso(value)`: valida e normalizza stringa `HH:MM`; ritorna `null` se non valido.
- `src/lib/supabase.ts`: client Supabase browser singleton (`createBrowserClient` da `@supabase/ssr`).
- `src/lib/supabase-server.ts`: factory client Supabase server (`createServerClient` da `@supabase/ssr`, con cookie store Next.js).

### 6.7 Convenzioni identita membro
- Rendering allineato su `name` + `avatar_url`.
- `pizza_emoji` mantenuto a livello DB per la visualizzazione nei voti votazione, ma non e una dipendenza del rendering principale (profilo/recensioni).

### 6.8 Guard routing canonico
- Script: `scripts/check-canonical-routes.mjs`.
- Controllo AST-based su `src` per individuare riferimenti ai path legacy in: `href` JSX, `redirect()`/`permanentRedirect()`, `router.push()`/`router.replace()`.
- Comando: `npm run check:routes`.

---

## 7. API interne

### 7.1 `POST /api/places/search`
File: `src/app/api/places/search/route.ts`.

Input JSON:
- `query` (string, required)
- `latitude` (number, optional)
- `longitude` (number, optional)

Comportamento:
- Chiama `https://places.googleapis.com/v1/places:searchText` con field mask minimale.
- Risponde con `{ id, name, address, city, latitude, longitude, mapsUri, photoName }`.

Errori tipici: `Missing GOOGLE_MAPS_API_KEY` se la variabile d'ambiente non e valorizzata.

### 7.2 `GET /api/places/photo`
File: `src/app/api/places/photo/route.ts`.

Input query:
- `name` (required): valore `google_photo_name` ricevuto da Places.
- `w` (optional): larghezza max thumbnail.

Comportamento: proxy server-side verso Google Places Photo; non espone la API key al client; ritorna stream immagine con cache header.

### 7.3 `GET /api/avatar`
File: `src/app/api/avatar/route.ts`.

Input query: `url` (required) — URL completo dell'avatar Google da proxare.

Comportamento:
- Valida che `url` sia `https:` e che l'host corrisponda a `*.googleusercontent.com` (allowlist); altrimenti risponde 400.
- Fetch server-side dell'immagine e restituzione dello stream con `Content-Type` originale e `Cache-Control: public, max-age=86400`; 502 se l'upstream fallisce.
- Motivo: alcuni avatar Google, se caricati direttamente cross-origin dal browser, vengono bloccati in modo incostante da Chrome ORB (Opaque Response Blocking), causando fallback silenzioso alle iniziali. Il proxy server-side elimina il problema rendendo la richiesta same-origin.
- Usato automaticamente da `src/components/ui/Avatar.tsx` (funzione `resolveAvatarSrc`) per qualunque `avatarUrl` con host `googleusercontent.com`; altri URL (es. incollati manualmente nel profilo) restano invariati.

### 7.4 `GET /api/calendar`
File: `src/app/api/calendar/route.ts`.

Input query: `id` (visit ID, required).

Comportamento:
- Se `scheduled_at` esiste: esporta evento ICS con orario.
- Se `scheduled_at` manca: esporta evento ICS all-day sulla sola `date`.

### 7.5 `GET /api/keepalive`
File: `src/app/api/keepalive/route.ts`.

Scopo: prevenire la pausa automatica del DB Supabase sul piano free (pausa dopo 7 giorni di inattivita).

Comportamento:
- Se la variabile `CRON_SECRET` e configurata, richiede header `Authorization: Bearer <CRON_SECRET>`; altrimenti risponde 401 `{ ok: false, error: "Unauthorized" }`. Se `CRON_SECRET` non e configurata, il controllo viene saltato (nessuna rottura per ambienti che non l'hanno ancora impostata).
- Crea un client Supabase con anon key (non richiede sessione utente).
- Esegue `SELECT id FROM profiles LIMIT 1`.
- Risponde `{ ok: true }` su successo, `{ ok: false, error: "..." }` con status 500 su errore.

Invocazione: esclusivamente da Vercel Cron (configurato in `vercel.json`, header `Authorization` aggiunto automaticamente da Vercel quando `CRON_SECRET` e settata nelle env vars del progetto). Non e un endpoint funzionale pubblico.

Nota middleware: `src/proxy.ts` esenta esplicitamente `/api/keepalive` dal redirect-to-login altrimenti applicato a ogni richiesta non autenticata (vedi 4.5) — senza questa eccezione le chiamate di Vercel Cron, che non hanno mai una sessione browser, non raggiungerebbero mai il route handler.

---

## 8. Configurazione ambiente

### 8.1 Variabili d'ambiente

Variabili client + server (prefisso `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

Variabili server-only:
- `GOOGLE_MAPS_API_KEY` (Places API)
- `CLOUDINARY_API_KEY` (opzionale, per operazioni server-side Cloudinary)
- `CLOUDINARY_API_SECRET` (opzionale, per operazioni server-side Cloudinary)
- `CRON_SECRET` (opzionale ma consigliata; protegge `/api/keepalive` — vedi 7.5)

Template: `env.example` in root progetto. Non committare `.env.local`.

### 8.2 Google Cloud (Places)
- API da abilitare: **Places API (New)**.
- Restrizioni consigliate per la API key:
  - API restrictions: solo Places API (New).
  - Application restrictions: in base all'ambiente (HTTP referrer per prod, IP per server).
- Billing GCP necessario (quota gratuita per SKU; oltre soglia a pagamento).

### 8.3 Supabase Auth
- Provider Google abilitato nella dashboard Supabase.
- Site URL locale: `http://localhost:3000`.
- Redirect URL locale: `http://localhost:3000/auth/callback`.
- In produzione: aggiornare Site URL + Redirect URL con il dominio Vercel.

### 8.4 Vercel Deployment e Cron
- File configurazione: `vercel.json` in root progetto.
- Cron configurato: `GET /api/keepalive` ogni 5 giorni alle 08:00 UTC (`0 8 */5 * *`).
- Variabili d'ambiente configurate in Vercel dashboard (Settings → Environment Variables), inclusa `CRON_SECRET`: quando presente, Vercel aggiunge automaticamente l'header `Authorization: Bearer <CRON_SECRET>` alle chiamate cron, verificato dalla route (vedi 7.5).
- Il cron si attiva automaticamente al primo deploy successivo al push di `vercel.json`.
- Verificabile in Vercel dashboard sotto Settings → Crons.
- Limite piano Hobby Vercel: massimo 2 cron job, frequenza massima una volta al giorno.

---

## 9. Migrazioni database

Cartella: `supabase/migrations/`. Applicare in ordine cronologico via SQL Editor di Supabase Cloud.

| # | File | Note |
|---|---|---|
| 1 | `20260422190500_init.sql` | Solo per DB nuovo |
| 2 | `20260422191500_existing_db_security_sync.sql` | Per DB esistente: sync RLS/sicurezza |
| 3 | `20260422194000_membership_and_invites.sql` | |
| 4 | `20260422201500_magic_link_invite_gate.sql` | Storica; login principale ora e OAuth Google |
| 5 | `20260422213000_agenda_poll_first.sql` | Schema votazioni + RPC finalizzazione |
| 6 | `20260422221000_drop_legacy_planner_tables.sql` | Rimozione tabelle legacy |
| 7 | `20260422224000_visit_attendees_admin_management.sql` | |
| 8 | `20260423182000_pizzerias_google_metadata.sql` | |
| 9 | `20260424102000_visits_scheduled_at_and_admin_update.sql` | |
| 10 | `20260424113000_pizza_of_night_single_tag.sql` | |
| 11 | `20260424130000_visit_notes_multi_user.sql` | |
| 12 | `20260424134500_reviews_allow_half_points.sql` | Colonne voto in `double precision` |
| 13 | `20260424141000_pizzerias_custom_image.sql` | |
| 14 | `20260424144000_set_pizza_of_night_sync_pizzeria_cover.sql` | |
| 15 | `20260424145000_set_pizza_of_night_event_only.sql` | |
| 16 | `20260424150000_cleanup_deleted_photo_references.sql` | |
| 17 | `20260424151000_cleanup_updated_photo_references.sql` | |
| 18 | `20260621000000_cancel_poll_admin_only.sql` | Policy delete admin-only su poll aperte |
| 19 | `20260723130000_calendar_open_date_proposals.sql` | Policy insert `agenda_poll_date_options`: qualsiasi membro, non solo owner/admin |
| 20 | `20260723140000_enable_realtime_planner_tables.sql` | Abilita `postgres_changes` su `agenda_polls`, `agenda_poll_date_options`, `agenda_poll_date_votes`, `pizzerias` |

---

## 10. Sicurezza

Pratiche applicate:
- Invite-only a livello callback server (non solo UI).
- RLS su tutte le tabelle pubbliche.
- Policy granulari per owner / admin / self.
- RPC di finalizzazione con controlli permessi interni.
- Vincolo DB di unicita tag "foto della serata" per evento.
- Cancellazione poll bloccata a livello RLS per poll chiuse e per non-admin.
- Realtime (`postgres_changes`) rispetta le stesse policy RLS `select` delle query normali: nessun dato aggiuntivo esposto rispetto a quanto gia leggibile via REST.
- `/api/avatar` valida host (`*.googleusercontent.com`) e protocollo (`https:`) prima di fare fetch server-side, per evitare che diventi un proxy generico verso URL arbitrari (mitigazione SSRF).
- `/api/keepalive` protetta da `CRON_SECRET` quando configurata (vedi 7.5, 8.1); esplicitamente esentata dal redirect-to-login del middleware (vedi 4.5) perche invocata da Vercel Cron senza sessione browser.

Attenzioni operative:
- Non esporre `GOOGLE_MAPS_API_KEY` nel client; e e deve rimanere server-side.
- Non committare `.env.local`.
- Proteggere la API key Google con restrizioni HTTP/IP.
- Usare l'upload preset Cloudinary corretto (case-sensitive).
- `/api/keepalive` usa anon key e non aggiunge logica privilegiata; senza `CRON_SECRET` configurata resta comunque raggiungibile pubblicamente (esegue solo una `SELECT` innocua, ma vale la pena impostare la variabile in produzione).

---

## 11. Qualita e verifiche

Comandi disponibili:

```bash
npm run lint          # ESLint
npm run check:routes  # guard path canonici (AST-based)
npm run build         # build produzione Next.js
```

Stato atteso prima del deploy:
- lint senza errori;
- nessuna violazione di path legacy;
- build Next.js completa senza errori TypeScript.

### 11.1 CI
- Workflow: `.github/workflows/ci.yml`.
- Step automatici su push e pull request:
  1. `npm ci`
  2. `npm run lint`
  3. `npm run check:routes`
  4. `npm run build`

---

## 12. Troubleshooting rapido

**La votazione non si aggiorna in tempo reale tra piu utenti**
Verificare che la migrazione `20260723140000_enable_realtime_planner_tables.sql` sia stata eseguita: senza le tabelle nella publication `supabase_realtime`, il canale si apre ma non riceve eventi. Controllare anche la console browser per errori tipo `CHANNEL_ERROR`.

**Un riquadro appare chiaro/bianco su sfondo scuro (dark mode)**
Quasi certamente un colore hardcoded sfuggito al refactor (vedi 2.5): cercare `rgba(255,255,255` o `bg-white` letterali nel componente incriminato e sostituire con `var(--surface-soft)` / `var(--surface-strong)` / `var(--surface-solid)` a seconda del contesto.

**Avatar di alcuni utenti non si vedono (mostrano le iniziali al posto della foto)**
Chrome blocca in modo incostante alcuni hotlink diretti a `lh3.googleusercontent.com` (ORB, Opaque Response Blocking) — non e un bug applicativo. `Avatar.tsx` instrada gia questi URL attraverso `/api/avatar`, che risolve il problema facendo il fetch server-side. Se il problema persiste, verificare nella tab Network del browser che la richiesta sia effettivamente verso `/api/avatar?url=...` e non direttamente verso `googleusercontent.com`.

**`/api/keepalive` risponde 401 anche con la chiamata corretta di Vercel Cron**
Verificare che il valore di `CRON_SECRET` in Vercel (Settings → Environment Variables) sia identico a quello atteso dalla route; Vercel deve rigenerare il deploy dopo aver aggiunto/modificato la variabile.

**Il DB Supabase risulta comunque in pausa nonostante il cron**
Prima di questa modifica, `src/proxy.ts` reindirizzava a `/accedi` qualsiasi richiesta non autenticata verso `/api/keepalive`, quindi la query di keepalive non veniva mai eseguita dalle chiamate di Vercel Cron. Verificare che sia presente l'eccezione per `/api/keepalive` in `proxy.ts` (vedi 4.5) e che la route non risponda con un redirect.

**`Missing GOOGLE_MAPS_API_KEY`**
Aggiungere la key in `.env.local` e riavviare il dev server.

**`Errore auth not_invited`**
Verificare che l'email sia presente in `public.invites` e che `profiles.is_member` sia `true`.

**`relation already exists` su migrazione init**
Usare la migrazione `existing_db_security_sync` per DB esistenti invece di rieseguire `init`.

**`Caricamento Cloudinary fallito (400)`**
Verificare `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` e `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. Il preset deve esistere, essere di tipo `unsigned` e il nome e case-sensitive.

**`Voti recensione con .5 falliscono`**
Applicare migrazione `20260424134500_reviews_allow_half_points.sql`. Verificare che le colonne voto in `public.reviews` siano `double precision`.

**`DB Supabase in pausa (piano free)`**
Il DB Supabase free si mette in pausa dopo 7 giorni di inattivita. Soluzione attiva: Vercel Cron chiama `/api/keepalive` ogni 5 giorni. Se il cron non risulta attivo, riattivare manualmente il DB dal dashboard Supabase e verificare che `vercel.json` sia stato deployato.

**`Build fallita: Property 'icon' is missing`**
Il componente `Button` richiede il prop `icon` obbligatorio. Aggiungere `icon={<FiX className="h-4 w-4" />}` (o altra icona da `react-icons/fi`) a ogni istanza Button priva di icona.

---

## 13. Convenzioni di sviluppo

- **Lingua UI**: italiano. Nomenclatura business: "evento", "votazione", non "poll" nei testi visibili all'utente.
- **Mobile-first**: componenti interattivi (modal, menu) full-screen su mobile.
- **Componenti UI condivisi**: usare sempre `Button`, `ButtonLink`, `Modal`, `CollapsiblePanel`, `ToastProvider` invece di elementi nativi non stilizzati.
- **Prop `icon` obbligatorio su `Button`**: ogni bottone deve avere un'icona esplicita da `react-icons/fi`.
- **Azioni distruttive**: usare `variant="unstyled"` con palette terracotta:
  - trigger: `bg-[rgba(178,74,47,0.1)] text-(--terracotta-deep)`
  - confirm: `bg-[rgba(178,74,47,0.85)] text-white`
- **Documentazione**: aggiornare questo file e `guida-funzionale.md` quando cambia un flusso, uno schema o una migrazione.
