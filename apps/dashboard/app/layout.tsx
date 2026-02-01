import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'OnSite Club',
    template: '%s | OnSite Club',
  },
  description: 'Professional tools for construction workers',
  keywords: ['construction', 'timekeeper', 'calculator', 'onsite'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
