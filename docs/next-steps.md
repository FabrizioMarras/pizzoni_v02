# Next Steps

Funzionalita e miglioramenti da valutare per le prossime sessioni di sviluppo.
Ordinate per impatto stimato, non per priorita assoluta.

---

## Alta priorita

### 1. Upload avatar nel Profilo
**Cosa:** permettere l'upload diretto di un'immagine profilo invece di incollare un URL manualmente.
**Perche:** Cloudinary upload e gia integrato in tutta l'app (foto evento, pizzerie); estenderlo al profilo e coerente e migliora l'UX.
**Come:** riutilizzare `uploadImageToCloudinary` in `src/lib/cloudinary.ts` e `FileButton` nel componente `ProfileEditor`.
**Stima:** bassa complessita, codice gia disponibile.

### 2. Notifica alla creazione e chiusura di una votazione
**Cosa:** email automatica ai membri quando viene aperta una nuova votazione o quando una viene finalizzata.
**Perche:** oggi non c'e modo di sapere che esiste una nuova poll senza aprire l'app.
**Come:** trigger email via Supabase Edge Function (o servizio esterno tipo Resend, piano free) agganciato a `finalize_agenda_poll` e alla creazione di `agenda_polls`.
**Stima:** media complessita (richiede configurazione servizio email).

---

## Media priorita

### 3. Scheletri di caricamento (loading skeletons)
**Cosa:** placeholder visivi mentre i dati vengono caricati su connessioni lente.
**Perche:** alcune pagine (eventi, pizzerie) mostrano contenuto vuoto durante il fetch server-side.
**Come:** componenti skeleton CSS inline, senza dipendenze esterne.
**Stima:** bassa complessita tecnica, da applicare pagina per pagina.

---

## Bassa priorita / nice to have

### 4. Pagina statistiche
**Cosa:** statistiche di gruppo — membro piu attivo, citta piu visitata, evento con punteggio piu alto, foto piu caricate, ecc.
**Perche:** il gruppo usa l'app da tempo e ha dati sufficienti per visualizzazioni interessanti.
**Come:** query aggregate su `reviews`, `visit_attendees`, `photos`, `visits`.

### 5. PWA / app installabile
**Cosa:** `manifest.json` + service worker per permettere l'installazione sul telefono come app nativa.
**Perche:** l'UI e gia mobile-first; l'installazione migliora l'accessibilita per i membri meno tecnici.
**Come:** Next.js supporta PWA con `next-pwa` o configurazione manuale del manifest.

### 6. Dark mode
**Cosa:** tema scuro che si attiva in base alla preferenza di sistema.
**Perche:** le CSS custom properties sono gia in `src/app/globals.css`; aggiungere `prefers-color-scheme: dark` non richiede modifiche strutturali.
**Come:** aggiungere un blocco `@media (prefers-color-scheme: dark)` con le variabili di colore ridefinite.
**Stima:** bassa complessita tecnica, richiede cura sul design.

---

## Note operative

- Iniziare da **#1 (avatar upload)**: massimo impatto, minima complessita, tutto il codice necessario e gia nel repo.
- **#2 (notifiche email)** dipende dalla scelta del servizio email; valutare Supabase Edge Functions vs Resend.

---

## Completate

- **Modifica votazione aperta** (2026-07-23): owner/admin possono ora modificare pizzeria/nota di una votazione aperta senza cancellarla e ricrearla (`updateEventVotePizzeria`). Le date non sono piu opzioni fisse decise dall'owner: qualsiasi membro le propone tramite calendario condiviso, risolvendo di fatto anche la parte "aggiungere opzioni data" di questo item.
- **Aggiornamenti real-time nella votazione** (2026-07-23): i voti, le date proposte, le modifiche pizzeria e la finalizzazione/cancellazione della poll ora si propagano dal vivo a tutti i membri collegati, senza ricaricare la pagina. Implementato con un canale `supabase.channel()` su `postgres_changes` (`agenda_polls`, `agenda_poll_date_options`, `agenda_poll_date_votes`, `pizzerias`) in `PlannerBoard.tsx`, con refetch debounced (~300ms) invece di patch granulari sullo stato. Verificato manualmente con due finestre browser aperte in contemporanea.
- **Mostra chi non ha ancora votato** (2026-07-23): nella votazione aperta, un riquadro "Non hanno ancora votato" elenca (con avatar) i membri senza un voto `available` sulla poll corrente; si aggiorna anche live grazie alla sottoscrizione real-time gia presente. Implementato aggiungendo il fetch di `profiles` (`is_member = true`) a `fetchPlannerData` in `event-votes-client.ts`.
- **Fix caricamento avatar Google** (2026-07-23): alcuni avatar Google (`lh3.googleusercontent.com`) venivano bloccati dal browser (Chrome ORB, Opaque Response Blocking) quando caricati direttamente cross-origin, causando fallback silenzioso alle iniziali in modo incostante in tutta l'app. Risolto con un proxy server-side `/api/avatar` (stesso pattern di `/api/places/photo`, gia esistente per le foto Google delle pizzerie), usato automaticamente da `Avatar.tsx` per qualunque URL `googleusercontent.com`.
- **Protezione `/api/keepalive` con CRON_SECRET** (2026-07-23): la route ora richiede `Authorization: Bearer <CRON_SECRET>` quando la variabile e configurata. Durante l'implementazione e emerso un bug preesistente piu serio: il middleware (`src/proxy.ts`) reindirizzava a `/accedi` qualsiasi richiesta non autenticata, incluso `/api/keepalive` — il che significa che le chiamate di Vercel Cron (che non hanno mai una sessione browser) molto probabilmente non arrivavano mai alla query di keepalive. Aggiunta un'eccezione esplicita in `proxy.ts` per questa route (protetta dal proprio controllo `CRON_SECRET` invece che dal login). Verificato manualmente: nessun header → 401, header errato → 401, header corretto → 200 `{ok:true}`.
