import type { Metadata, Viewport } from 'next'
import NativeBridge from '@/components/NativeBridge'
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
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F5F5F4] min-h-screen">
        <NativeBridge />
        {children}
      </body>
    </html>
  )
}
