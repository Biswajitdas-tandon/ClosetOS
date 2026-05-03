'use client';

import { useState } from 'react';
import Link from 'next/link';
import { browserClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setOauthBusy(true);
    setOauthError(null);
    try {
      const supabase = browserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      // On success, the browser is redirected to Google — code below only runs on failure.
      if (error) throw error;
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Could not start Google sign-in');
      setOauthBusy(false);
    }
  }

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
          One tap with Google, or a magic link to your inbox.
        </p>

        {status === 'sent' ? (
          <div className="rounded-md border border-border-subtle bg-bg-surface p-6 text-sm">
            Check <strong>{email}</strong> for your sign-in link.
          </div>
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={oauthBusy}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-border-subtle bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-border-strong disabled:opacity-60"
            >
              <GoogleIcon />
              {oauthBusy ? 'Redirecting…' : 'Continue with Google'}
            </button>
            {oauthError ? (
              <p className="text-sm text-status-sold">{oauthError}</p>
            ) : null}

            <Divider label="or" />

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
          </div>
        )}
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-text-muted">
      <span className="h-px flex-1 bg-border-subtle" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

function GoogleIcon() {
  // Inline so we don't pull in another dep. Google brand SVG.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
