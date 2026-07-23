# Guida Funzionale Pizzoni

Questo documento descrive cosa puo fare l'utente in ogni pagina dell'app. E il riferimento principale per capire il comportamento atteso delle funzionalita, indipendentemente dall'implementazione tecnica.

Per i dettagli tecnici, vedere `docs/documentazione-tecnica.md`.

---

## Indice

1. [Login](#1-login-accedi)
2. [Classifica](#2-classifica-)
3. [Pizzerie](#3-pizzerie-pizzerie)
4. [Eventi](#4-eventi-eventi)
5. [Dettaglio Evento](#5-dettaglio-evento-eventiid)
6. [Votazione](#6-votazione-in-eventi)
7. [Profilo](#7-profilo-profilo)
8. [Errore autenticazione](#8-errore-autenticazione-authauth-code-error)
9. [Changelog](#changelog)

---

## 1. Login (`/accedi`)

- Accesso solo con Google OAuth.
- L'utente clicca `Continua con Google`.
- Se l'email e stata invitata da un admin, l'accesso viene completato.
- Se l'email non e invitata, viene mostrata una pagina di errore con il motivo.

**Regole di accesso:**
- Solo utenti con email presente nella lista inviti possono entrare nell'app.
- Gli inviti sono gestiti dall'admin dalla pagina Profilo.
- Il primo utente in assoluto viene promosso automaticamente ad admin.

---

## 2. Classifica (`/`)

- Mostra le pizzerie ordinate per punteggio medio delle recensioni.
- Permette di filtrare per citta.
- Le posizioni sono indicate con badge visivi (oro, argento, bronzo).
- Serve per vedere rapidamente i locali migliori visitati dal gruppo.

---

## 3. Pizzerie (`/pizzerie`)

- Elenco di tutte le pizzerie inserite, in layout a card (1 colonna mobile, 2 tablet, 3 desktop).
- Filtri rapidi: tutte / visitate / da visitare.
- Ricerca per nome, citta o indirizzo.
- L'elenco carica i primi elementi e ne aggiunge altri scorrendo la pagina.
- Link rapido a Google Maps per ogni locale.

**Aggiunta nuova pizzeria:**
- Apertura modal con form: nome, indirizzo, citta.
- Ricerca integrata Google Places: digitando il nome appaiono suggerimenti in tempo reale. Selezionando un risultato, nome, indirizzo e citta vengono compilati automaticamente.
- Bottone geolocalizzazione per ricevere suggerimenti vicini alla posizione attuale.
- Upload immagine copertina opzionale (se omessa, il sistema usa automaticamente la foto Google o un placeholder).
- Se nome e citta corrispondono a una pizzeria gia presente, la creazione viene bloccata con un avviso.

---

## 4. Eventi (`/eventi`)

- Pagina principale per pianificazione e storico degli eventi.
- Nella parte alta: il prossimo evento in programma (stesso blocco della home).
- Nella parte centrale: la votazione aperta (se presente).
- Nella parte bassa: lo storico degli eventi passati.

**Storico:**
- Elenco cronologico degli eventi conclusi.
- Ricerca per pizzeria, citta o data.
- Caricamento incrementale scorrendo la pagina.
- Link al dettaglio di ogni evento.

**Nota:** gli eventi non vengono creati manualmente. Vengono generati automaticamente quando una votazione viene finalizzata con una data vincente.

---

## 5. Dettaglio Evento (`/eventi/[id]`)

- Mostra informazioni dell'evento: locale, data, indirizzo, punteggio medio e posizione in classifica.
- Le sezioni sono collassabili: espandere solo quelle di interesse.

**Orario evento** *(owner o admin)*
- Imposta data e orario esatto della prenotazione del tavolo.
- Una volta impostato, l'orario determina quando l'evento passa da "prossimo" a "storico".

**Cambio pizzeria** *(owner o admin)*
- Permette di associare una pizzeria diversa all'evento dopo la creazione.
- Si puo scegliere tra le pizzerie gia presenti o cercarne una nuova via Google Places.

**Partecipazione**
- Ogni membro puo aggiungersi o rimuoversi dalla lista partecipanti.
- L'admin puo aggiungere o rimuovere qualsiasi membro tramite un menu a discesa.

**Recensioni**
- Ogni membro puo inserire o modificare la propria recensione.
- Categorie di voto: qualita pizza, ambiente, servizio, rapporto qualita/prezzo (scala 0-10, supporto mezzi punti es. 8.5).
- Elenco di tutte le recensioni ricevute con punteggio finale.

**Note evento**
- Ogni membro puo aggiungere note libere all'evento (es. ricordi, annotazioni).
- Solo l'autore puo modificare o eliminare la propria nota.

**Foto**
- Upload da galleria o scatto diretto con la camera del dispositivo.
- E possibile taggare una foto come "foto della serata": un solo tag attivo per evento alla volta.
- Ogni autore puo eliminare le proprie foto.

---

## 6. Votazione (in `/eventi`)

Il flusso di pianificazione e votazione-first: prima si vota la data, poi l'evento viene creato.

**Creazione votazione** *(qualsiasi membro)*
- Apertura modal con: pizzeria (esistente o nuova), nota opzionale. Non si scelgono date in questa fase.
- La votazione appare nella sezione "Votazione Aperta" della pagina eventi.
- Puo esistere una sola votazione aperta alla volta: il form di creazione resta nascosto finche quella attiva non viene chiusa o cancellata.

**Calendario disponibilita** *(tutti i membri)*
- Ogni membro apre un calendario e segna le proprie date libere toccando i giorni: il tocco propone la data (se non esiste ancora) e registra il voto "disponibile"; toccando di nuovo il voto viene rimosso.
- Non esiste un voto esplicito "non disponibile": l'assenza di selezione significa semplicemente nessuna informazione per quel giorno.
- Su desktop il calendario mostra due mesi affiancati (mese corrente + successivo); su mobile un solo mese alla volta, con frecce per navigare avanti/indietro.
- Ogni giorno con almeno un voto mostra un numero che indica quante persone sono disponibili; il giorno odierno e evidenziato con un contorno.
- Sotto al calendario, la lista **"Date piu votate"** mostra le date con voti ordinate per numero di disponibili (le prime 3 per default, con un toggle "Mostra tutte" per vederle tutte).
- Tutto si aggiorna in tempo reale: se un altro membro tocca una data, propone una nuova data, cambia la pizzeria o finalizza/cancella la votazione mentre hai la pagina aperta, lo vedi comparire senza dover ricaricare.
- Un riquadro **"Non hanno ancora votato"** mostra, con foto profilo, i membri che non hanno ancora segnato nessuna data disponibile; quando tutti hanno votato viene mostrato un messaggio di conferma al suo posto.

**Modifica pizzeria** *(owner della votazione o admin)*
- Bottone `Modifica pizzeria` nell'header della sezione "Votazione Aperta".
- Permette di correggere nome/indirizzo/citta/nota della votazione aperta, oppure di sostituire completamente la pizzeria scelta (cercandone una nuova o selezionandone una esistente), senza dover cancellare e ricreare la votazione.
- Non modifica retroattivamente eventi gia finalizzati: agisce solo sulla votazione ancora aperta.

**Finalizzazione** *(owner della votazione o admin)*
- L'owner (o un admin) seleziona la data con piu voti (o un'altra data proposta) e chiude la votazione dalla lista "Date piu votate".
- Alla chiusura: viene creato automaticamente l'evento in `visits`, con i partecipanti pre-compilati dai voti "disponibile" sulla data scelta.
- L'orario prenotazione si aggiunge dopo, nel dettaglio evento.
- Una volta finalizzata, la votazione diventa sola lettura.

**Cancellazione votazione** *(solo admin)*
- Se una votazione e stata aperta per errore, l'admin puo cancellarla.
- Bottone `Cancella votazione` nell'header della sezione, visibile solo agli admin.
- Richiede conferma in un modal prima di procedere.
- Elimina la votazione e tutti i voti associati in modo irreversibile.
- Non e possibile cancellare una votazione gia chiusa/finalizzata.

**Regole operative:**
- Un solo owner per votazione.
- Una sola votazione aperta alla volta: l'app blocca la creazione di una seconda finche quella attiva non viene chiusa o cancellata.
- Qualsiasi membro puo proporre nuove date sul calendario, non solo l'owner.
- In caso di pareggio tra piu date, la scelta finale spetta a owner/admin.
- Una votazione finalizzata non si puo modificare retroattivamente; eventuali correzioni richiedono una nuova votazione.

---

## 7. Profilo (`/profilo`)

- Modifica profilo personale: nome e URL avatar.

**Sezione admin — Inviti:**
- Inserimento email da invitare (deve essere una Gmail, necessaria per il login Google).
- Elenco inviti inviati con stato (in attesa / accettato) e data accettazione.
- Le email invitate possono autenticarsi con Google al primo accesso.

---

## 8. Errore autenticazione (`/auth/auth-code-error`)

- Pagina di fallback in caso di errore durante il login.
- Mostra il motivo principale (es. email non invitata).
- Azioni disponibili: tornare al login o alla pagina precedente.

---

## Changelog

- 2026-04-22: Prima versione guida funzionale. Definita direzione votazione-first.
- 2026-04-22: Implementata votazione date + finalizzazione automatica visita.
- 2026-04-24: Aggiunto orario evento (`scheduled_at`) e transizione upcoming/storico su datetime.
- 2026-04-24: Flusso foto aggiornato (camera in-app + upload manuale) e tag unico "foto della serata".
- 2026-04-24: Introdotti componenti UI condivisi (`Button`, `Checkbox`, `ToastProvider`).
- 2026-04-24: `Button` aggiornato con supporto icone sinistra/destra.
- 2026-05-03: Aggiunte regole immagini pizzeria/evento, note multiutente, fallback avatar.
- 2026-05-04: Aggiunta ricerca riusabile e paginazione incrementale su Pizzerie e storico Eventi.
- 2026-05-04: Aggiunto controllo duplicati in creazione pizzeria su nome + citta.
- 2026-06-21: Aggiunto cambio pizzeria evento per owner/admin nel dettaglio evento.
- 2026-06-21: Aggiunta gestione partecipanti admin (aggiunta/rimozione manuale da dropdown membri).
- 2026-06-21: Votazione aperta mostra i votanti per ogni opzione data con nome ed emoji.
- 2026-06-21: Sezioni dettaglio evento rese collassabili.
- 2026-06-21: Aggiunta cancellazione votazione aperta da admin con conferma modal.
- 2026-06-21: Aggiunto Vercel Cron per prevenire pausa DB Supabase piano free.
- 2026-06-21: Aggiunta anteprima OG dinamica per condivisione eventi (WhatsApp, Telegram, etc.): immagine pizzeria, nome, data e orario.
- 2026-07-23: Sostituito il voto per opzioni data fisse con un calendario di disponibilita condiviso (doppio mese su desktop, singolo su mobile); qualsiasi membro puo proporre nuove date. Rimosso il voto esplicito "non disponibile" a favore di un modello opt-in.
- 2026-07-23: Aggiunta la lista "Date piu votate" con le prime 3 date in evidenza e toggle per mostrarle tutte.
- 2026-07-23: Aggiunta la possibilita per owner/admin di modificare la pizzeria di una votazione aperta senza doverla ricreare.
- 2026-07-23: La votazione aperta si aggiorna ora in tempo reale per tutti i membri collegati (voti, nuove date, modifica pizzeria, finalizzazione/cancellazione), senza bisogno di ricaricare la pagina.
- 2026-07-23: Aggiunto il riquadro "Non hanno ancora votato" nella votazione aperta, per capire subito chi sollecitare.
- 2026-07-23: Risolto un problema per cui alcuni avatar Google non venivano mostrati (fallback silenzioso alle iniziali) a causa di un blocco del browser sui link diretti; ora tutti gli avatar passano da un proxy interno.
- 2026-07-23: Protetta la route interna di keepalive del database con un controllo di autorizzazione; risolto anche un bug per cui questa chiamata automatica non arrivava mai a destinazione, con il rischio che il database si mettesse in pausa nonostante il cron attivo.
- 2026-07-23: Aggiunti placeholder di caricamento (skeleton) su Classifica, Eventi, Pizzerie e dettaglio evento, cosi la pagina non resta vuota su connessioni lente mentre i dati arrivano.
- 2026-07-23: Aggiunto un tema scuro automatico che segue le preferenze del dispositivo/browser (nessun interruttore manuale in app): se il telefono o il computer sono impostati su tema scuro, Pizzoni si adatta da solo.
