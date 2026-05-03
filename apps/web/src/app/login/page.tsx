'use client';

import { useState } from 'react';
import Link from 'next/link';
import { browserClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const supabase = browserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link');
      setStatus('error');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-10 block font-display text-2xl tracking-tight">
          ClosetOS
        </Link>
        <h1 className="mb-2 font-display text-3xl">Sign in</h1>
        <p className="mb-8 text-sm text-text-secondary">
          We&apos;ll email you a one-tap magic link.
        </p>
        {status === 'sent' ? (
          <div className="rounded-md border border-border-subtle bg-bg-surface p-6 text-sm">
            Check <strong>{email}</strong> for your sign-in link.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm outline-none focus:border-border-strong"
              />
            </label>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {error ? (
              <p className="text-sm text-status-sold">{error}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
