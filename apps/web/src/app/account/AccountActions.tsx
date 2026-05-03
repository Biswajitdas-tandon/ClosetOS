'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase';

export function AccountActions({ email }: { email: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    const supabase = browserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed (${res.status})`);
      }
      // Server invalidated session; sign out client too and bounce home.
      const supabase = browserClient();
      await supabase.auth.signOut();
      window.location.href = '/?deleted=1';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <p className="text-sm font-medium">Sign out</p>
          <p className="text-xs text-text-muted">End this browser session.</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-md border border-border-subtle bg-bg-base px-3 py-1.5 text-sm hover:border-border-strong"
        >
          Sign out
        </button>
      </div>

      {!confirming ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-status-sold">Delete account</p>
            <p className="text-xs text-text-muted">
              Permanently removes every item, outfit, image, and login session. Cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md border border-status-sold/40 bg-bg-base px-3 py-1.5 text-sm text-status-sold hover:border-status-sold"
          >
            Delete…
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-status-sold/40 bg-status-sold/5 p-4">
          <p className="text-sm">
            Type <code className="rounded bg-bg-muted px-1 py-0.5">{email}</code> below to confirm
            permanent deletion.
          </p>
          <input
            type="email"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none focus:border-border-strong"
          />
          {error ? <p className="text-sm text-status-sold">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={busy || phrase !== email}
              className="rounded-md bg-status-sold px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Deleting…' : 'I understand — delete my account'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setPhrase(''); setError(null); }}
              className="rounded-md border border-border-subtle bg-bg-base px-4 py-2 text-sm hover:border-border-strong"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
