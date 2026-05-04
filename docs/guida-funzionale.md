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
- Upload immagine pizzeria opzionale in creazione.
- Visualizzazione elenco pizzerie gia inserite.
- Ricerca nell'elenco per nome, citta o indirizzo.
- Filtri rapidi: tutte, visitate, da visitare.
- L'elenco mostra le prime card e carica altri elementi scorrendo la pagina.
- Layout a card responsive (1 col mobile, 2 tablet, 3 desktop).
- Link rapido a Google Maps per ogni locale.

## 4. Eventi (`/eventi`)
- Pagina principale per pianificazione + storico eventi.
- Creazione nuova votazione tramite bottone `Aggiungi` (visibile quando non c'e una votazione aperta).
- Blocco `Prossimo Evento Pizzoni` uguale alla home (nessun pulsante duplicato interno).
- Elenco cronologico degli eventi registrati.
- Ricerca nello storico per pizzeria, citta o data.
- Lo storico mostra le prime card e carica altri eventi scorrendo la pagina.
- Link al dettaglio del singolo evento.
- La creazione di nuovi eventi non avviene manualmente qui.
  - L'evento viene generato automaticamente quando una votazione viene chiusa con data vincente.

## 5. Dettaglio Evento (`/eventi/[id]`)
- Mostra informazioni della visita (locale, data, note, indirizzo).
- Owner/admin puo impostare l'orario prenotazione dell'evento.
- Link per apertura rapida in Google Maps.
- Ogni membro puo inserire/modificare la propria recensione (0-10 per categoria).
- Elenco di tutte le recensioni ricevute.
- Ogni membro puo aggiungere note evento; solo autore puo modificare/eliminare la propria nota.
- Caricamento foto della visita:
  - scelta da galleria o scatto camera;
  - upload manuale con bottone `Aggiungi`;
  - supporto a tag unico `foto della serata` (una sola per evento).

## 6. Poll Eventi (in `/eventi`)
- Flusso principale di pianificazione (votazione-first) integrato in Eventi.
- Un membro designato (owner del turno) crea una votazione con:
  - pizzeria proposta (esistente o nuova)
  - opzioni data multiple
  - eventuale nota
- I membri votano la disponibilita sulle date proposte.
- L'owner (o admin) chiude la votazione e seleziona il risultato finale.
- Alla chiusura:
  - se la pizzeria non esiste, viene creata in `pizzerias`
  - viene creata la riga in `visits` con la data scelta
  - pre-compilazione partecipanti in base ai voti disponibilita
- L'orario prenotazione viene aggiunto dopo, nel dettaglio evento (non votato in poll).
- Dopo la chiusura, la votazione diventa sola lettura.

## 7. Profilo (`/profilo`)
- Modifica profilo personale: nome e avatar.
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
- `Eventi` mostra prossimo evento + storico e dettaglio.
- Storico eventi basato su data/ora evento (`scheduled_at` se presente).
- Creazione evento manuale rimossa da `Eventi`.
- Azioni principali standardizzate con pulsanti coerenti (icona + testo).
- Identita membri: avatar se presente, altrimenti fallback automatico.
- Immagini pizzeria: Google -> foto della serata piu recente -> custom -> placeholder.
- Immagini evento: foto della serata prioritaria; fallback su logica pizzeria.
- Ricerca e paginazione incrementale sono disponibili in `Pizzerie` e nello storico `Eventi`.

## Sezione Aggiornamenti
Aggiornare questo blocco ogni volta che viene aggiunta/modificata una funzionalita.

- 2026-04-22: Creata prima versione della guida funzionale.
- 2026-04-22: Definita direzione Agenda v2 (votazione-first) e ruolo di `Visite` come storico.
- 2026-04-22: Implementata Agenda v2 con votazione date + finalizzazione automatica visita.
- 2026-04-24: Aggiunto orario evento (`scheduled_at`) e transizione upcoming/storico su datetime.
- 2026-04-24: Flusso foto aggiornato (camera in-app + upload manuale) e tag unico `foto della serata`.
- 2026-04-24: Introdotti componenti UI condivisi (`Button`, `Checkbox`, `ToastProvider`).
- 2026-04-24: Aggiornato `Button` condiviso con supporto icone sinistra/destra e applicazione su tutti i pulsanti.
- 2026-05-03: Guida aggiornata con regole immagini pizzeria/evento, note multiutente e fallback avatar.
- 2026-05-04: Aggiunta ricerca riusabile e paginazione incrementale su `Pizzerie` e storico `Eventi`.
