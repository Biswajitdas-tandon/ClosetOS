import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClosetOS — your wardrobe, organized',
  description: 'A premium personal inventory system for apparel, accessories, jewelry, silver, and artwork.',
};

// Set theme on <html> before paint to avoid flash of wrong colours.
const themeBootstrap = `
  (function(){
    try {
      var p = localStorage.getItem('theme') || 'system';
      var dark = p === 'dark' || (p === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      if (p !== 'system') document.documentElement.dataset.themePref = p;
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
