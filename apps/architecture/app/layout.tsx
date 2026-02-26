import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OnSite Eagle — Architecture Dashboard',
  description: 'Live architecture map of the OnSite Club monorepo ecosystem',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: '#FAFAF8' }}>{children}</body>
    </html>
  );
}
