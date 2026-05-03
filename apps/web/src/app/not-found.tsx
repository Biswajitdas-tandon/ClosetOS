import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">404</p>
        <h1 className="mt-3 font-display text-4xl">Lost in the closet.</h1>
        <p className="mt-3 text-sm text-text-secondary">
          Couldn&apos;t find that page. It may have been moved or never existed.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent hover:bg-accent-hover"
          >
            Go home
          </Link>
          <Link
            href="/library"
            className="rounded-md border border-border-subtle bg-bg-surface px-4 py-2 text-sm hover:border-border-strong"
          >
            Open library
          </Link>
        </div>
      </main>
    </div>
  );
}
