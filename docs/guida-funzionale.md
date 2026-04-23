# Guida Funzionale Pizzoni

Documento di riferimento per capire cosa puo fare l'utente in ogni pagina.
Questo file verra aggiornato man mano che aggiungiamo nuove funzionalita.

## 1. Login (`/accedi`)
- Accesso solo con Google.
- L'utente clicca `Continua con Google`.
- Se l'email e invitata, entra nell'app.
- Se non e invitata, viene mostrato un errore di autenticazione.

## 2. Classifica (`/`)
- Mostra le pizzerie ordinate per punteggio medio.
- Permette filtro per citta.
- Serve per vedere rapidamente i locali migliori del gruppo.

## 3. Pizzerie (`/pizzerie`)
- Aggiunta nuova pizzeria: nome, indirizzo, citta.
- Visualizzazione elenco pizzerie gia inserite.
- Link rapido a Google Maps per ogni locale.

## 4. Eventi (`/eventi`)
- Pagina principale per pianificazione + storico eventi.
- Creazione nuova votazione e scelta date direttamente nella stessa pagina.
- Elenco cronologico degli eventi registrati.
- Link al dettaglio del singolo evento.
- La creazione di nuovi eventi non avviene manualmente qui.
  - L'evento viene generato automaticamente quando una votazione viene chiusa con data vincente.

## 5. Dettaglio Evento (`/eventi/[id]`)
- Mostra informazioni della visita (locale, data, note, indirizzo).
- Link per apertura rapida in Google Maps.
- Ogni membro puo inserire/modificare la propria recensione (0-10 per categoria).
- Elenco di tutte le recensioni ricevute.
- Caricamento foto della visita con supporto a "pizza della serata".

## 6. Poll Eventi (in `/eventi`)
- Flusso principale di pianificazione (votazione-first) integrato in Eventi.
- Un membro designato (owner del turno) crea una votazione con:
  - pizzeria proposta (esistente o nuova)
  - opzioni data/ora multiple
  - eventuale nota
- I membri votano la disponibilita sulle date proposte.
- L'owner (o admin) chiude la votazione e seleziona il risultato finale.
- Alla chiusura:
  - se la pizzeria non esiste, viene creata in `pizzerias`
  - viene creata la riga in `visits` con la data scelta
  - pre-compilazione partecipanti in base ai voti disponibilita
- Dopo la chiusura, la votazione diventa sola lettura.

## 7. Profilo (`/profilo`)
- Modifica profilo personale: nome, avatar, emoji pizza.
- Se utente admin:
  - Sezione `Inviti Admin`.
  - Inserimento email da invitare.
  - Le email invitate possono autenticarsi con Google.

## 8. Errore Auth (`/auth/auth-code-error`)
- Pagina di fallback in caso di errore accesso.
- Mostra motivo principale (es. email non invitata).
- Azioni: ritorno al login o pagina precedente.

## Regole Di Accesso
- Accesso applicativo tramite Google OAuth.
- Solo utenti invitati/membri autorizzati possono entrare.
- Gestione inviti tramite tabella `public.invites` + controllo membership in `public.profiles`.

## Regole Poll v2
- Un solo owner per ogni turno decisionale.
- Una votazione attiva alla volta (versione semplice per gruppo piccolo).
- Solo owner/admin puo finalizzare la votazione.
- In caso di pareggio date, decide l'owner.
- Una volta finalizzata, non si modifica la visita generata dalla votazione; eventuali cambi creano nuova votazione o update admin tracciato.

## Stato Attuale
- `Eventi` gestisce votazioni, scelta data e finalizzazione.
- `Eventi` mostra storico e dettaglio.
- Creazione evento manuale rimossa da `Eventi`.

## Sezione Aggiornamenti
Aggiornare questo blocco ogni volta che viene aggiunta/modificata una funzionalita.

- 2026-04-22: Creata prima versione della guida funzionale.
- 2026-04-22: Definita direzione Agenda v2 (votazione-first) e ruolo di `Visite` come storico.
- 2026-04-22: Implementata Agenda v2 con votazione date + finalizzazione automatica visita.
