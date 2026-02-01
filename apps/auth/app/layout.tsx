import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OnSite Auth - Login',
  description: 'Acesso seguro ao ecossistema OnSite Club',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-onsite-light">
        {children}
      </body>
    </html>
  );
}
