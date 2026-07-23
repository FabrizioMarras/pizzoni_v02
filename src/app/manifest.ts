import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pizzoni',
    short_name: 'Pizzoni',
    description: 'Recensioni social di pizzerie con classifica e pianificazione visite.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f0e4',
    theme_color: '#b24a2f',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
