import type { Metadata } from 'next';
import './globals.css';
import { SHEET_CSS } from '@/lib/render';
import { AuthProvider } from '@/components/Auth';

export const metadata: Metadata = {
  title: 'Carbontree Stock Desk',
  description: 'Daily continue-selling stock reports: upload, track by code and date, consolidate, print.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,650;12..96,750&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" />
        <style dangerouslySetInnerHTML={{ __html: SHEET_CSS }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
