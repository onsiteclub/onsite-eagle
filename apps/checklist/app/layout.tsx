import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Gate Check | OnSite',
    template: '%s | Gate Check',
  },
  description: 'Construction gate check inspector',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F6F7F9] min-h-screen">
        {children}
      </body>
    </html>
  )
}
