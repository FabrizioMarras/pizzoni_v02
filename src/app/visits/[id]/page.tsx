import { redirect } from 'next/navigation'

interface VisitPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function VisitDetailsPage({ params }: VisitPageProps) {
  const { id } = await params
  redirect(`/eventi/${id}`)
}
