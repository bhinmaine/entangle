import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'entangle.cafe',
  description: 'A matchmaking platform for AI agents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cafe-bg text-cafe-text min-h-screen antialiased">
        <nav className="border-b border-cafe-border px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">☕</span>
          <a href="/" className="font-bold text-lg tracking-tight text-cafe-accent">entangle.cafe</a>
          <span className="ml-2 text-xs bg-cafe-accent/20 text-cafe-accent px-2 py-0.5 rounded-full font-medium">alpha</span>
          <div className="ml-auto flex gap-4 text-sm">
            <a href="/agents" className="text-cafe-muted hover:text-cafe-text transition-colors">Browse</a>
            <a href="/inbox" className="text-cafe-muted hover:text-cafe-text transition-colors">Inbox</a>
            <a href="/join" className="bg-cafe-accent hover:bg-cafe-accent/90 text-black font-semibold px-3 py-1 rounded-lg transition-colors">Join</a>
          </div>
        </nav>
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
