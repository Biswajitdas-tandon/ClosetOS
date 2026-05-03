'use client';

import { useEffect, useState } from 'react';

type Props = {
  resourceType: 'item' | 'outfit' | 'folder';
  resourceId: string;
};

type CreatedShare = {
  url: string;
  expires_at: string | null;
  permission: 'view' | 'edit';
};

export function ShareButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
      >
        <ShareIcon /> Share
      </button>
      {open ? <ShareModal {...props} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareModal({ resourceType, resourceId, onClose }: Props & { onClose: () => void }) {
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [expires, setExpires] = useState<'never' | '1' | '7' | '30'>('7');
  const [creating, setCreating] = useState(false);
  const [share, setShare] = useState<CreatedShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/share/link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
          permission,
          expires_in_days: expires === 'never' ? undefined : Number(expires),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed (${res.status})`);
      }
      const data = (await res.json()) as CreatedShare;
      setShare(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create link');
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="font-display text-lg">Share {resourceType}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {!share ? (
          <div className="space-y-5 px-5 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Access</label>
              <div className="flex gap-2">
                {(['view', 'edit'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPermission(p)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                      permission === p
                        ? 'border-accent bg-accent text-text-onAccent'
                        : 'border-border-subtle bg-bg-base text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    {p === 'view' ? 'View only' : 'Can edit'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Expires</label>
              <div className="flex gap-2">
                {([
                  ['1', '24 hrs'],
                  ['7', '7 days'],
                  ['30', '30 days'],
                  ['never', 'Never'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setExpires(value)}
                    className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${
                      expires === value
                        ? 'border-accent bg-accent text-text-onAccent'
                        : 'border-border-subtle bg-bg-base text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error ? <p className="text-sm text-status-sold">{error}</p> : null}

            <button
              type="button"
              onClick={create}
              disabled={creating}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {creating ? 'Creating link…' : 'Create share link'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Anyone with this link can {share.permission === 'edit' ? 'edit' : 'view'}
              {share.expires_at
                ? ` until ${new Date(share.expires_at).toLocaleDateString()}`
                : ''}.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={share.url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-md border border-border-subtle bg-bg-base px-3 py-2 font-mono text-xs text-text-primary"
              />
              <button
                type="button"
                onClick={copy}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent hover:bg-accent-hover"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="block w-full text-sm text-text-secondary hover:text-text-primary"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
