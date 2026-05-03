'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('app error:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Something broke</p>
      <h1 className="mt-3 font-display text-3xl">Sorry — that didn&apos;t work.</h1>
      <p className="mt-3 text-sm text-text-secondary">
        {error.message || 'An unexpected error occurred.'}
      </p>
      {error.digest ? (
        <code className="mt-2 rounded bg-bg-muted px-2 py-1 text-xs text-text-muted">
          {error.digest}
        </code>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-border-subtle bg-bg-surface px-4 py-2 text-sm hover:border-border-strong"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
