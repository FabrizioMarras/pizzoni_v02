import { Suspense } from 'react'
import AuthCodeErrorContent from './auth-code-error-content'

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-600">Caricamento...</p>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <AuthCodeErrorContent />
    </Suspense>
  )
}
