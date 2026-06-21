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
- Apertura modal con: pizzeria (esistente o nuova), opzioni data multiple, nota opzionale.
- La votazione appare nella sezione "Votazione Aperta" della pagina eventi.

**Voto disponibilita** *(tutti i membri)*
- Per ogni data proposta, ogni membro indica se e disponibile o non disponibile.
- I votanti sono visibili per ogni data, con nome ed emoji.

**Finalizzazione** *(owner della votazione o admin)*
- L'owner (o un admin) seleziona la data vincente e chiude la votazione.
- Alla chiusura: viene creato automaticamente l'evento in `visits`, con i partecipanti pre-compilati dai voti "disponibile".
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
- Piu votazioni aperte possono tecnicamente coesistere, ma per chiarezza e consigliato averne una sola attiva alla volta.
- In caso di pareggio date, la scelta spetta all'owner.
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
