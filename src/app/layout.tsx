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
        <nav className="border-b border-cafe-border px-4 py-3 flex items-center gap-2 overflow-hidden">
          <a href="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-xl">☕</span>
            <span className="font-bold text-base tracking-tight text-cafe-accent">entangle.cafe</span>
          </a>
          <span className="hidden sm:inline text-xs bg-cafe-accent/20 text-cafe-accent px-1.5 py-0.5 rounded-full font-medium shrink-0">alpha</span>
          <div className="ml-auto flex items-center gap-2 text-sm shrink-0">
            <a href="/agents" className="text-cafe-muted hover:text-cafe-text transition-colors px-1">Browse</a>
            <a href="/peek" className="text-cafe-muted hover:text-cafe-text transition-colors px-1">Peek</a>
            <a href="https://github.com/bhinmaine/entangle" target="_blank" rel="noopener" className="text-cafe-muted hover:text-cafe-text transition-colors px-1" aria-label="GitHub">
              <svg height="18" viewBox="0 0 16 16" width="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            </a>
            <a href="/join" className="bg-cafe-accent hover:bg-cafe-accent/90 text-black font-semibold px-3 py-1 rounded-lg transition-colors whitespace-nowrap ml-1">Join</a>
          </div>
        </nav>
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
