# Next Steps

Funzionalita e miglioramenti da valutare per le prossime sessioni di sviluppo.
Ordinate per impatto stimato, non per priorita assoluta.

---

## Alta priorita

### 1. Aggiornamenti real-time nella votazione
**Cosa:** i voti degli altri membri appaiono in tempo reale senza ricaricare la pagina.
**Perche:** oggi due persone con il poll aperto contemporaneamente non si vedono a vicenda.
**Come:** Supabase Realtime e gia incluso nel piano free. Aggiungere un `supabase.channel()` su `agenda_poll_date_votes` in `PlannerBoard.tsx`.
**Stima:** bassa complessita, alto impatto sull'esperienza di voto.

### 2. Upload avatar nel Profilo
**Cosa:** permettere l'upload diretto di un'immagine profilo invece di incollare un URL manualmente.
**Perche:** Cloudinary upload e gia integrato in tutta l'app (foto evento, pizzerie); estenderlo al profilo e coerente e migliora l'UX.
**Come:** riutilizzare `uploadImageToCloudinary` in `src/lib/cloudinary.ts` e `FileButton` nel componente `ProfileEditor`.
**Stima:** bassa complessita, codice gia disponibile.

### 3. Mostra chi non ha ancora votato
**Cosa:** nella votazione aperta, elenco dei membri che non hanno ancora espresso disponibilita.
**Perche:** facile capire chi sollecitare senza dover ricordare mentalmente chi c'e nel gruppo.
**Come:** confrontare `profiles` (tutti i membri) con i `user_id` presenti in `agenda_poll_date_votes` per la poll corrente.
**Stima:** bassa complessita.

### 4. Notifica alla creazione e chiusura di una votazione
**Cosa:** email automatica ai membri quando viene aperta una nuova votazione o quando una viene finalizzata.
**Perche:** oggi non c'e modo di sapere che esiste una nuova poll senza aprire l'app.
**Come:** trigger email via Supabase Edge Function (o servizio esterno tipo Resend, piano free) agganciato a `finalize_agenda_poll` e alla creazione di `agenda_polls`.
**Stima:** media complessita (richiede configurazione servizio email).

---

## Media priorita

### 5. Modifica votazione aperta
**Cosa:** owner o admin possono modificare una votazione aperta (aggiungere opzioni data, correggere nome/indirizzo pizzeria).
**Perche:** oggi l'unica correzione possibile e cancellare e ricreare la poll da zero.
**Come:** form di edit inline nella sezione "Votazione Aperta", visibile solo a owner/admin. RLS update gia permessa a owner/admin.
**Nota:** rimozione di opzioni data con voti esistenti va gestita con attenzione (bloccare o avvisare).

### 6. Scheletri di caricamento (loading skeletons)
**Cosa:** placeholder visivi mentre i dati vengono caricati su connessioni lente.
**Perche:** alcune pagine (eventi, pizzerie) mostrano contenuto vuoto durante il fetch server-side.
**Come:** componenti skeleton CSS inline, senza dipendenze esterne.
**Stima:** bassa complessita tecnica, da applicare pagina per pagina.

### 7. Protezione `/api/keepalive` con CRON_SECRET
**Cosa:** aggiungere un controllo `Authorization: Bearer <CRON_SECRET>` sulla route keepalive.
**Perche:** l'endpoint e pubblicamente raggiungibile; Vercel passa automaticamente questo header se `CRON_SECRET` e configurato nelle env vars.
**Come:** aggiungere la variabile `CRON_SECRET` in Vercel + controllo header in `src/app/api/keepalive/route.ts`.
**Stima:** 15 minuti di lavoro.

---

## Bassa priorita / nice to have

### 8. Pagina statistiche
**Cosa:** statistiche di gruppo — membro piu attivo, citta piu visitata, evento con punteggio piu alto, foto piu caricate, ecc.
**Perche:** il gruppo usa l'app da tempo e ha dati sufficienti per visualizzazioni interessanti.
**Come:** query aggregate su `reviews`, `visit_attendees`, `photos`, `visits`.

### 9. PWA / app installabile
**Cosa:** `manifest.json` + service worker per permettere l'installazione sul telefono come app nativa.
**Perche:** l'UI e gia mobile-first; l'installazione migliora l'accessibilita per i membri meno tecnici.
**Come:** Next.js supporta PWA con `next-pwa` o configurazione manuale del manifest.

### 10. Dark mode
**Cosa:** tema scuro che si attiva in base alla preferenza di sistema.
**Perche:** le CSS custom properties sono gia in `src/app/globals.css`; aggiungere `prefers-color-scheme: dark` non richiede modifiche strutturali.
**Come:** aggiungere un blocco `@media (prefers-color-scheme: dark)` con le variabili di colore ridefinite.
**Stima:** bassa complessita tecnica, richiede cura sul design.

---

## Note operative

- Iniziare da **#1 (real-time)** e **#2 (avatar upload)**: massimo impatto, minima complessita, tutto il codice necessario e gia nel repo.
- **#7 (CRON_SECRET)** e piccolo ma vale la pena farlo insieme al prossimo deploy.
- **#4 (notifiche email)** dipende dalla scelta del servizio email; valutare Supabase Edge Functions vs Resend.
