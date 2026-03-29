import type { Metadata } from 'next';
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
          <span className="text-2xl">⚓</span>
          <span className="font-bold text-lg tracking-tight">entangle.cafe</span>
          <span className="ml-2 text-xs bg-cafe-accent/20 text-cafe-accent2 px-2 py-0.5 rounded-full font-medium">alpha</span>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
