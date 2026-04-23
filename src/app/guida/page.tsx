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
            <p><strong>2. Vota le date:</strong> indica per ogni data se sei disponibile o no.</p>
            <p><strong>3. Finalizzazione:</strong> owner/admin chiude la votazione e seleziona la data.</p>
            <p><strong>4. Evento creato:</strong> l&apos;evento viene creato automaticamente in <strong>Eventi</strong>.</p>
            <p><strong>5. Serata completata:</strong> apri il dettaglio evento, aggiungi recensione e foto.</p>
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Cosa Fare In Ogni Pagina</h2>
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p><strong>Classifica:</strong> vedi le migliori pizzerie in base ai voti medi.</p>
            <p><strong>Pizzerie:</strong> inserisci un locale nel catalogo del gruppo.</p>
            <p><strong>Eventi:</strong> crea/vota una votazione e consulta lo storico delle serate confermate.</p>
            <p><strong>Dettaglio evento:</strong> partecipa, recensisci, carica foto, vedi i punteggi.</p>
            <p><strong>Profilo:</strong> aggiorna nome/avatar/emoji; gli admin gestiscono gli inviti.</p>
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Domande Comuni</h2>
          <div className="space-y-2 text-sm text-[var(--ink)]">
            <p><strong>Se non ho votato la votazione?</strong> Nel dettaglio evento puoi cliccare <strong>Partecipo</strong>.</p>
            <p><strong>Posso essere aggiunto manualmente?</strong> Si, un admin puo aggiungerti nei partecipanti.</p>
            <p><strong>Come entro nell&apos;app?</strong> Accesso solo con Google e solo per email invitate.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
