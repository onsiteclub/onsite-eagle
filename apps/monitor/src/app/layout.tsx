import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnSite Eagle - Construction Vision",
  description: "AI-powered construction site monitoring and progress tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
