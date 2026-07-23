import Nav from '@/components/Nav'

export default function GuidaPage() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <section className="glass-card p-6">
          <h1 className="page-title">Guida Rapida</h1>
          <p className="page-subtitle mt-2">Come usare Pizzoni senza confusione, passo dopo passo.</p>
        </section>

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Flusso Consigliato</h2>
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p><strong>1. Eventi:</strong> apri o crea la votazione della prossima uscita.</p>
            <p><strong>2. Segna le tue date:</strong> apri il calendario e seleziona i giorni in cui sei libero.</p>
            <p><strong>3. Finalizzazione:</strong> owner/admin chiude la votazione e seleziona la data più votata.</p>
            <p><strong>4. Evento creato:</strong> l&apos;evento viene creato automaticamente in <strong>Eventi</strong>.</p>
            <p><strong>5. Orario:</strong> owner/admin imposta data+ora prenotazione nel dettaglio evento.</p>
            <p><strong>6. Serata completata:</strong> apri il dettaglio evento, aggiungi recensione, note e foto.</p>
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Cosa Fare In Ogni Pagina</h2>
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p><strong>Classifica:</strong> vedi le migliori pizzerie in base ai voti medi.</p>
            <p><strong>Pizzerie:</strong> inserisci un locale nel catalogo, filtra visitate/non visitate e apri Google Maps.</p>
            <p><strong>Eventi:</strong> crea/vota una votazione, vedi prossimo evento e storico serate concluse.</p>
            <p><strong>Dettaglio evento:</strong> partecipa, imposta orario (owner/admin), recensisci, aggiungi note, carica foto.</p>
            <p><strong>Profilo:</strong> aggiorna nome/avatar; gli admin gestiscono gli inviti.</p>
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Regole Immagini</h2>
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p><strong>Card pizzeria:</strong> priorità <strong>Google</strong> → foto della serata più recente → immagine custom → placeholder.</p>
            <p><strong>Card evento:</strong> se esiste, usa la <strong>foto della serata</strong>; altrimenti usa la logica immagine pizzeria.</p>
            <p><strong>Foto della serata:</strong> è una sola per evento. Cambiandola, si aggiorna subito la copertina dell&apos;evento.</p>
            <p><strong>Eliminazione/sostituzione:</strong> i riferimenti DB vengono ripuliti/aggiornati automaticamente.</p>
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Identità Membri</h2>
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p>Se disponibile, viene mostrato l&apos;<strong>avatar</strong> del membro.</p>
            <p>Se manca avatar, l&apos;app mostra un fallback automatico.</p>
            <p>Alla login Google, se il nome profilo è vuoto, viene compilato automaticamente dai dati Google.</p>
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Domande Comuni</h2>
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p><strong>Se non ho votato la votazione?</strong> Nel dettaglio evento puoi cliccare <strong>Partecipo</strong>.</p>
            <p><strong>Posso essere aggiunto manualmente?</strong> Si, un admin puo aggiungerti nei partecipanti.</p>
            <p><strong>Come entro nell&apos;app?</strong> Accesso solo con Google e solo per email invitate.</p>
            <p><strong>Posso avere più eventi futuri?</strong> Sì, il sistema lo permette.</p>
            <p><strong>Ho sbagliato pizzeria nella votazione?</strong> Owner o admin possono cambiarla con il bottone <strong>Modifica pizzeria</strong> finché la votazione è aperta.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
