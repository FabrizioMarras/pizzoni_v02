import type { Metadata } from 'next'
import Script from 'next/script'
import { ToastProvider } from '@/components/ui/ToastProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pizzoni',
  description: 'Recensioni social di pizzerie con classifica e pianificazione visite.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
