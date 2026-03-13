import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutWrapper } from './LayoutWrapper';
import { Navbar } from './Navbar';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RHC Pedidos',
  description: 'Sistema de Pedidos Hospitalares',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
        <LayoutWrapper navbar={<Navbar />}>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
