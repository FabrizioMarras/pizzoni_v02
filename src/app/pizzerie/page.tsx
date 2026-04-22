import Nav from '@/components/Nav'
import PizzeriaManager from '@/components/PizzeriaManager'

export default function PizzeriasPage() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap">
        <h1 className="page-title">Pizzerie</h1>
        <p className="page-subtitle mb-6">Crea e consulta i locali testati dal gruppo.</p>
        <PizzeriaManager />
      </main>
    </div>
  )
}
